// ----------------------
// Imports
// ----------------------
const express = require("express");
const { engine } = require("express-handlebars");
const { Pool } = require("pg");
const bodyParser = require("body-parser");
const session = require("express-session");
const connectPostgres = require("connect-pg-simple")(session);
const bcrypt = require("bcrypt");

// ----------------------
// PostgreSQL setup
// ----------------------
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // krävs av Render
});

// ----------------------
// Express app setup
// ----------------------
const app = express();
const port = process.env.PORT || 8080;

// Handlebars setup
app.engine("handlebars", engine());
app.set("view engine", "handlebars");
app.set("views", "./views");

// Static files
app.use(express.static("public"));

// Body parser
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Sessions
app.use(
  session({
    store: new connectPostgres({
      pool: pool,
      tableName: "session",
    }),
    saveUninitialized: false,
    resave: false,
    secret: "J@ghar3nhår1gkatt$0mh3t3rFran$&Är6294192674034156294årqammaL",
  })
);

// ----------------------
// Create tables
// ----------------------
async function createTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      userid SERIAL PRIMARY KEY,
      username TEXT NOT NULL,
      password TEXT NOT NULL
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS workItems (
      wid SERIAL PRIMARY KEY,
      wname TEXT NOT NULL,
      wdesc TEXT NOT NULL,
      wtype TEXT NOT NULL,
      wimgURL TEXT NOT NULL
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS guestbook (
      gid SERIAL PRIMARY KEY,
      gname TEXT NOT NULL,
      gemail TEXT NOT NULL,
      gcomment TEXT NOT NULL,
      gdate TEXT
    );
  `);

  await pool.query(`
  CREATE TABLE IF NOT EXISTS "session" (
    "sid" varchar NOT NULL COLLATE "default",
    "sess" json NOT NULL,
    "expire" timestamp(6) NOT NULL,
    PRIMARY KEY ("sid")
  );
`);

await pool.query(`
  CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
`);


  console.log("Tables ready!");
}

createTables().catch((err) => console.error("Error creating tables:", err));

// ----------------------
// Register
// ----------------------
app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  try {
    const hash = await bcrypt.hash(password, 10);

    await pool.query(
      "INSERT INTO users (username, password) VALUES ($1, $2)",
      [username, hash]
    );

    console.log("User registered:", username);
    res.redirect("/login");
  } catch (error) {
    console.log("Register error:", error);
    res.redirect("/register");
  }
});

// ----------------------
// Login
// ----------------------
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    // Hämta användare från databasen
    const userResult = await pool.query(
      "SELECT * FROM users WHERE username = $1",
      [username]
    );

    const user = userResult.rows[0];

    if (!user) {
      console.log("User not found");
      return res.redirect("/login");
    }

    // Jämför lösenord
    const match = await bcrypt.compare(password, user.password);

    if (match) {
      // Logga in användaren och sätt session
      req.session.isLoggedIn = true;
      req.session.name = user.username;
      req.session.isAdmin = user.isadmin;

      console.log("Welcome back:", user.username);
      res.redirect("/");
    } else {
      console.log("Incorrect password");
      res.redirect("/login");
    }

  } catch (error) {
    console.log("Login error:", error);
    res.redirect("/login");
  }
});
// ----------------------
// Guestbook submit
// ----------------------
app.post("/submit-comment", async (req, res) => {
  const { name, email, comment } = req.body;
  const currentDate = new Date();
  const formattedDate = `${currentDate.getDate()}/${
    currentDate.getMonth() + 1
  }/${currentDate.getFullYear()} ${currentDate.getHours()}:${currentDate.getMinutes()}`;

  try {
    await pool.query(
      "INSERT INTO guestbook (gname, gemail, gcomment, gdate) VALUES ($1,$2,$3,$4)",
      [name, email, comment, formattedDate]
    );

    const result = await pool.query(
      "SELECT * FROM guestbook ORDER BY gdate DESC"
    );
    const comments = result.rows;

    res.render("home.handlebars", { comments });
  } catch (error) {
    console.log("Guestbook error:", error);
    res.status(500).send("Error");
  }
});

// ----------------------
// Guestbook edit/delete
// ----------------------
app.get("/edit/:id", async (req, res) => {
  const id = req.params.id;
  try {
    const result = await pool.query("SELECT * FROM guestbook WHERE gid=$1", [
      id,
    ]);
    const comment = result.rows[0];
    res.render("editCom.handlebars", { comment });
  } catch (error) {
    console.log(error);
    res.redirect("/");
  }
});

app.post("/edit/:id", async (req, res) => {
  const id = req.params.id;
  const updatedComment = req.body.comment;

  try {
    await pool.query("UPDATE guestbook SET gcomment=$1 WHERE gid=$2", [
      updatedComment,
      id,
    ]);
    res.redirect("/");
  } catch (error) {
    console.log("Edit error:", error);
    res.redirect("/");
  }
});

app.get("/delete/:id", async (req, res) => {
  const id = req.params.id;

  try {
    await pool.query("DELETE FROM guestbook WHERE gid=$1", [id]);
    res.redirect("/");
  } catch (error) {
    console.log("Delete error:", error);
    res.redirect("/");
  }
});

// ----------------------
// Home route
// ----------------------
app.get("/", async (req, res) => {
  const model = {
    isLoggedIn: req.session.isLoggedIn,
    name: req.session.name,
    isAdmin: req.session.isAdmin,
  };

  try {
    const result = await pool.query("SELECT * FROM guestbook ORDER BY gdate ASC");
    model.comments = result.rows;
    res.render("home.handlebars", model);
  } catch (error) {
    console.log("Error fetching guestbook:", error);
    res.status(500).send("Error");
  }
});

// ----------------------
// Work routes
// ----------------------
app.get("/work", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM workItems");
    const model = {
      workItems: result.rows,
      isLoggedIn: req.session.isLoggedIn,
      name: req.session.name,
      isAdmin: req.session.isAdmin,
      dbError: false,
      theError: "",
    };
    res.render("work.handlebars", model);
  } catch (error) {
    console.log("Work error:", error);
    const model = {
      workItems: [],
      dbError: true,
      theError: error,
      isLoggedIn: req.session.isLoggedIn,
      name: req.session.name,
      isAdmin: req.session.isAdmin,
    };
    res.render("work.handlebars", model);
  }
});

app.get("/work/:id", async (req, res) => {
  const id = req.params.id;
  try {
    const result = await pool.query("SELECT * FROM workItems WHERE wid=$1", [id]);
    const workItem = result.rows[0];
    res.render("workItems.handlebars", { wi: workItem });
  } catch (error) {
    console.log(error);
    res.redirect("/work");
  }
});

// Work edit, update, delete
app.get("/work/edit/:id", async (req, res) => {
  const id = req.params.id;
  try {
    const result = await pool.query("SELECT * FROM workItems WHERE wid=$1", [id]);
    const model = {
      workItems: result.rows[0],
      isLoggedIn: req.session.isLoggedIn,
      name: req.session.name,
      isAdmin: req.session.isAdmin,
    };
    res.render("edit.handlebars", model);
  } catch (error) {
    console.log(error);
    res.redirect("/work");
  }
});

app.post("/work/edit/:id", async (req, res) => {
  const id = req.params.id;
  const { wname, wdesc, wtype, wimg } = req.body;
  if (req.session.isLoggedIn && req.session.isAdmin) {
    try {
      await pool.query(
        "UPDATE workItems SET wname=$1, wdesc=$2, wtype=$3, wimgURL=$4 WHERE wid=$5",
        [wname, wdesc, wtype, wimg, id]
      );
      res.redirect("/work");
    } catch (error) {
      console.log(error);
      res.redirect("/work");
    }
  } else {
    res.redirect("/login");
  }
});

app.get("/work/delete/:id", async (req, res) => {
  const id = req.params.id;
  if (req.session.isLoggedIn && req.session.isAdmin) {
    try {
      await pool.query("DELETE FROM workItems WHERE wid=$1", [id]);
      res.redirect("/work");
    } catch (error) {
      console.log(error);
      res.redirect("/work");
    }
  } else {
    res.redirect("/login");
  }
});

// New project
app.get("/newp", (req, res) => {
  if (req.session.isLoggedIn && req.session.isAdmin) {
    res.render("newp.handlebars", {
      isLoggedIn: req.session.isLoggedIn,
      name: req.session.name,
      isAdmin: req.session.isAdmin,
    });
  } else {
    res.redirect("/login");
  }
});

app.post("/newp", async (req, res) => {
  const { wname, wdesc, wtype, wimg } = req.body;
  if (req.session.isLoggedIn && req.session.isAdmin) {
    try {
      await pool.query(
        "INSERT INTO workItems (wname, wdesc, wtype, wimgURL) VALUES ($1,$2,$3,$4)",
        [wname, wdesc, wtype, wimg]
      );
      res.redirect("/work");
    } catch (error) {
      console.log(error);
      res.redirect("/newp");
    }
  } else {
    res.redirect("/login");
  }
});

// Contact page
app.get("/contact", (req, res) => {
  res.render("contact.handlebars", {
    isLoggedIn: req.session.isLoggedIn,
    name: req.session.name,
    isAdmin: req.session.isAdmin,
  });
});

// Login & Register pages
app.get("/login", (req, res) => {
  res.render("login.handlebars", {
    isLoggedIn: req.session.isLoggedIn,
    name: req.session.name,
    isAdmin: req.session.isAdmin,
  });
});

app.get("/register", (req, res) => {
  res.render("register.handlebars");
});

// Logout
app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) console.log("Logout error:", err);
  });
  res.redirect("/");
});

// 404 route
app.use((req, res) => {
  res.status(404).render("404.handlebars");
});

// Start server
app.listen(port, () => {
  console.log(`Server running and listening on port ${port}...`);
});
