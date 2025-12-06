const express = require("express"); // loads the express package
const { engine } = require("express-handlebars"); // loads handlebars for Express
const sqlite3 = require("sqlite3");
const bodyParser = require("body-parser"); // loads the body-parser package
const session = require("express-session");
const connectSqlite3 = require("connect-sqlite3");
const bcrypt = require("bcrypt");

const db = new sqlite3.Database("portfolio-ig.db");

const app = express(); // creates the Express application
const port = 8080; // defines the port

// defines handlebars engine
app.engine("handlebars", engine());
// defines the view engine to be handlebars
app.set("view engine", "handlebars");
// defines the views directory
app.set("views", "./views");

// define static directory "public" to access css/ and img/
app.use(express.static("public"));

//-----------
// Post Forms
//-----------
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

//-----------
// Session
//-----------

// store sessions in the database.
const SQLiteStore = connectSqlite3(session);

// define session.
app.use(
  session({
    store: new SQLiteStore({ db: "session-db.db" }),
    saveUninitialized: false,
    resave: false,
    secret: "J@ghar3nhår1gkatt$0mh3t3rFran$&Är6294192674034156294årqammaL",
  })
);

app.post("/register", (req, res) => {
  const username = req.body.username;
  const password = req.body.password;

  bcrypt.hash(password, 10, (error, hash) => {
    if (error) {
      console.log("ERROR ", error);
      res.redirect("/register");
    } else {
      db.run(
        "CREATE TABLE IF NOT EXISTS users (userid INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT NOT NULL, password TEXT NOT NULL)",
        (error) => {
          if (error) {
            console.log("ERROR ", error);
          } else {
            console.log(" --> users table created!");

            db.run(
              "INSERT INTO users ( username, password) VALUES (?,?)",
              [username, hash],
              (error) => {
                if (error) {
                  console.log("ERROR ", error);
                } else {
                  console.log(" --> user registration successful!");
                  res.redirect("/login");
                }
              }
            );
          }
        }
      );
    }
  });
});

// check the login and password of a user.
app.post("/login", (req, res) => {
  const username = req.body.username;
  const password = req.body.password;

  db.get("SELECT * FROM users WHERE username=?", [username], (error, user) => {
    if (error || !user) {
      console.log("ERROR ", "user not found");
      res.redirect("/login");
    } else {
      bcrypt.compare(password, user.password, (error, result) => {
        if (error) {
          console.log("ERROR ", error);
        } else if (result) {
          console.log("welcome back, " + username + "...");
          req.session.isLoggedIn = true;
          req.session.name = username;
          req.session.isAdmin = username == "webmastr";
          res.redirect("/");
        } else {
          console.log("ERROR ", "incorrect password");
          res.redirect("/login");
        }
      });
    }
  });
});

db.run(
  "CREATE TABLE IF NOT EXISTS workItems (wid INTEGER PRIMARY KEY AUTOINCREMENT, wname TEXT NOT NULL, wdesc TEXT NOT NULL, wtype TEXT NOT NULL, wimgURL TEXT NOT NULL)",
  (error) => {
    if (error) {
      console.log("ERROR ", error);
    } else {
      console.log(" --> workItems table created!");

      // workItems.forEach((item) => {
      //   db.run(
      //     "INSERT INTO workItems (wname, wdesc, wtype, wimgURL) VALUES (?,?,?,?)",
      //     [item.name, item.desc, item.type, item.img],
      //     (error) => {
      //       if (error) {
      //         console.log("ERROR ", error);
      //       } else {
      //         console.log(" line added to the workItems table!");
      //       }
      //     }
      //   );
      // });
    }
  }
);

// CREATE A TABLE FOR GUESTBOOK //

db.run(
  "CREATE TABLE IF NOT EXISTS guestbook (gid INTEGER PRIMARY KEY AUTOINCREMENT, gname TEXT NOT NULL, gemail TEXT NOT NULL, gcomment TEXT NOT NULL, gdate TEXT)",
  (error) => {
    if (error) {
      console.log("ERROR ", error);
    } else {
      console.log(" --> guestbook table created!");
    }
  }
);

// HANDLE GUESTBOOK FORM

app.post("/submit-comment", (req, res) => {
  // The code below that handles the date was generated with some help from Codeium AI //
  const { name, email, comment } = req.body;
  const currentDate = new Date();

  const day = currentDate.getDate();
  const month = currentDate.getMonth() + 1; // Months are zero-based, so add 1
  const year = currentDate.getFullYear();
  const hours = currentDate.getHours();
  const minutes = currentDate.getMinutes();

  // Format the date as you desire
  const formattedDate = `${day}/${month}/${year} ${hours}:${minutes}`;

  db.run(
    "INSERT INTO guestbook (gname, gemail, gcomment, gdate) VALUES (?,?,?,?)",
    [name, email, comment, formattedDate],
    (error) => {
      if (error) {
        console.log("ERROR ", error);
        res.status(500).send("Internal Server Error");
      } else {
        console.log("comment successfully added!");
      }
    }
  );

  db.all("SELECT * FROM guestbook ORDER BY gdate DESC", (error, comments) => {
    if (error) {
      console.log("Error retrieving comments:", error);
      res.status(500).send("Error retrieving comments");
    } else {
      console.log(comments);
      res.render("home.handlebars", { comments });
    }
  });
});

app.get("/edit/:id", (req, res) => {
  const id = req.params.id;

  db.get("SELECT * FROM guestbook WHERE gid=?", [id], (error, comment) => {
    if (error) {
      console.log("ERROR ", error);
      res.render("/", model);
    } else {
      console.log("MODIFY: ", JSON.stringify(comment));
      console.log("MODIFY: ", comment);
      res.render("editCom.handlebars", { comment });
    }
  });
});

app.get("/delete/:id", (req, res) => {
  const id = req.params.id;

  db.run("DELETE FROM guestbook WHERE gid=?", [id], (error) => {
    if (error) {
      console.log("ERROR: ", error);
    } else {
      console.log("Comment Deleted!");
    }
    res.redirect("/");
  });
});

// POST request to update a guestbook comment
app.post("/edit/:id", (req, res) => {
  const id = req.params.id;
  const updatedComment = req.body.comment;

  db.run(
    "UPDATE guestbook SET gcomment=? WHERE gid=?",
    [updatedComment, id],
    (error) => {
      if (error) {
        console.log("Error updating comment: ", error);
      } else {
        console.log("Comment updated!");
      }
      res.redirect("/");
    }
  );
});

// CONTROLLER (THE BOSS) //

app.get("/", function (req, res) {
  console.log("SESSION: ", req.session);

  const model = {
    isLoggedIn: req.session.isLoggedIn,
    name: req.session.name,
    isAdmin: req.session.isAdmin,
  };

  // RENDER GUESTBOOK POSTS ON HOMEPAGE //

  db.all("SELECT * FROM guestbook ORDER BY gdate ASC", (error, comments) => {
    if (error) {
      console.log("Error retrieving comments:", error);
      res.status(500).send("Error retrieving comments");
    } else {
      model.comments = comments;
      res.render("home.handlebars", model);
    }
  });
});

// RETRIEVE & RENDER PROJECTS (workItems) //

app.get("/work", function (req, res) {
  db.all("SELECT * FROM workItems", function (error, theWorkItems) {
    if (error) {
      const model = {
        dbError: true,
        theError: error,
        workItems: [],
        isLoggedIn: req.session.isLoggedIn,
        name: req.session.name,
        isAdmin: req.session.isAdmin,
      };
      res.render("work.handlebars", model);
    } else {
      const model = {
        dbError: false,
        theError: "",
        workItems: theWorkItems,
        isLoggedIn: req.session.isLoggedIn,
        name: req.session.name,
        isAdmin: req.session.isAdmin,
      };
      res.render("work.handlebars", model);
    }
  });
});

// RETRIEVE ID FROM PROJECT (workItem) //

app.get("/work/:id", (req, res) => {
  const id = req.params.id;

  db.get("SELECT * FROM workItems WHERE wid=?", [id], (error, workItem) => {
    if (error) {
      console.log("Error: ", error);
      res.redirect("/");
    } else {
      res.render("workItems.handlebars", { wi: workItem });
    }
  });
});

// EDIT PROJECT (workItem) //

app.get("/work/edit/:id", (req, res) => {
  const id = req.params.id;
  console.log("EDIT: ", id);
  db.get(
    "SELECT * FROM workItems WHERE wid=?",
    [id],
    function (error, workItems) {
      if (error) {
        console.log("ERROR ", error);
        const model = {
          dbError: true,
          theError: error,
          workItems: {},
          isLoggedIn: req.session.isLoggedIn,
          name: req.session.name,
          isAdmin: req.session.isAdmin,
        };
        res.render("edit.handlebars", model);
      } else {
        console.log("MODIFY: ", JSON.stringify(workItems));
        console.log("MODIFY: ", workItems);
        const model = {
          dbError: false,
          theError: "",
          workItems: workItems,
          isLoggedIn: req.session.isLoggedIn,
          name: req.session.name,
          isAdmin: req.session.isAdmin,
          helpers: {
            theTypeW(value) {
              return value == "web";
            },
            theTypeG(value) {
              return value == "game";
            },
            theTypeD(value) {
              return value == "design";
            },
            theTypeU(value) {
              return value == "uxd";
            },
          },
        };
        res.render("edit.handlebars", model);
      }
    }
  );
});

app.post("/work/edit/:id", (req, res) => {
  const id = req.params.id;
  const newp = [
    req.body.wname,
    req.body.wdesc,
    req.body.wtype,
    req.body.wimg,
    id,
  ];
  if (req.session.isLoggedIn == true && req.session.isAdmin == true) {
    db.run(
      "UPDATE workItems SET wname=?, wdesc=?, wtype=?, wimgURL=? WHERE wid=?",
      newp,
      (error) => {
        if (error) {
          console.log("ERROR ", error);
        } else {
          console.log("Project Updated!");
        }
        res.redirect("/work");
      }
    );
  } else {
    res.redirect("/login");
  }
});

// DELETE PROJECT (workItem) //

app.get("/work/delete/:id", (req, res) => {
  const id = req.params.id;
  if (req.session.isLoggedIn == true && req.session.isAdmin == true) {
    db.run(
      "DELETE FROM workItems WHERE wid=?",
      [id],
      function (error, workItems) {
        if (error) {
          const model = {
            dbError: true,
            theError: error,
            isLoggedIn: req.session.isLoggedIn,
            name: req.session.name,
            isAdmin: req.session.isAdmin,
          };
          res.render("home.handlebars", model);
        } else {
          const model = {
            dbError: false,
            theError: "",
            isLoggedIn: req.session.isLoggedIn,
            name: req.session.name,
            isAdmin: req.session.isAdmin,
          };
          res.render("work.handlebars", model);
        }
      }
    );
  } else {
    res.redirect("/");
  }
});

// CONTACT PAGE //

app.get("/contact", function (req, res) {
  const model = {
    isLoggedIn: req.session.isLoggedIn,
    name: req.session.name,
    isAdmin: req.session.isAdmin,
  };

  res.render("contact.handlebars", model);
});

// NEW PROJECT //

app.get("/newp", (req, res) => {
  if (req.session.isLoggedIn == true && req.session.isAdmin == true) {
    const model = {
      isLoggedIn: req.session.isLoggedIn,
      name: req.session.name,
      isAdmin: req.session.isAdmin,
    };
    res.render("newp.handlebars", model);
  } else {
    res.redirect("/login");
  }
});

app.post("/newp", (req, res) => {
  const newp = [
    req.body.wid,
    req.body.wname,
    req.body.wdesc,
    req.body.wtype,
    req.body.wimg,
  ];

  if (req.session.isLoggedIn == true && req.session.isAdmin == true) {
    db.run("INSERT INTO workItems VALUES (?, ?, ?, ?, ?)", newp, (error) => {
      if (error) {
        console.log("ERROR ", error);
      } else {
        console.log(" line added to the workItems table!");
      }
    });
    res.redirect("/work");
  } else {
    res.redirect("/login");
  }
});

// LOGIN & LOGOUT SECTION //

app.get("/login", (req, res) => {
  const model = {
    isLoggedIn: req.session.isLoggedIn,
    name: req.session.name,
    isAdmin: req.session.isAdmin,
  };
  res.render("login.handlebars", model);
});

app.get("/register", (req, res) => {
  const model = {};
  res.render("register.handlebars", model);
});

app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    console.log("Something went wrong.", err);
  });
  console.log("Logged out.");
  res.redirect("/");
});

// defines the final default route 404 NOT FOUND //

app.use(function (req, res) {
  res.status(404).render("404.handlebars");
});

// runs the app and listens to the port //

app.listen(port, () => {
  console.log(`Server running and listening on port ${port}...`);
});
