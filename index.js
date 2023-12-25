const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");
const cors = require("cors");
const jwt = require("jsonwebtoken");

const dbPath = path.join(__dirname, "test.db");
const app = express();
app.use(cors());

app.use(express.json());

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({ filename: dbPath, driver: sqlite3.Database });
    app.listen(4000, () => {
      console.log("Server Running at http://localhost:4000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(-1);
  }
};
initializeDBAndServer();

const authenticateToken = (request, response, next) => {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "MY_SECRET_TOKEN", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        request.username = payload.username;
        next();
      }
    });
  }
};

//User Register API
app.post("/users/", async (request, response) => {
  const { username, password } = request.body;
  const selectUserQuery = `SELECT * FROM users WHERE username = '${username}'`;
  const dbUser = await db.get(selectUserQuery);
  if (dbUser === undefined) {

    const hashedPassword = await bcrypt.hash(password,10)
    const createUserQuery = `
      INSERT INTO 
        users (username, password) 
      VALUES 
        (
          '${username}', 
          '${hashedPassword}'
        )`;
    await db.run(createUserQuery);
    response.send(`User created successfully`);
  } else {
    response.send("User already exists");
  }
});

//User Login API
app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const selectUserQuery = `SELECT * FROM users WHERE username = '${username}'`;
  const dbUser = await db.get(selectUserQuery);
  if (dbUser === undefined) {
    
    response.send({ errorMsg: "Invalid User" });
  } else {
    const isPasswordMatched = await bcrypt.compare(password,dbUser.password)
    if (isPasswordMatched === true) {
      const payload = {
        username: username,
      };
      const jwtToken = jwt.sign(payload, "MY_SECRET_TOKEN");
      response.send({ jwt_token: jwtToken });
    } else {
      response.send({ errorMsg: "Invalid Password" });
    }
  }
});

app.get("/getData", authenticateToken, async (request, response) => {
  const get_query = `SELECT * FROM todolist`;

  const result = await db.all(get_query);

  response.send(result);
});

app.post("/postData", async (request, response) => {
  const { id, input_value, is_checked, status } = request.body;

  const post_query = `INSERT INTO todolist(id,input_value,is_checked,status)VALUES
    (${id},'${input_value}',${is_checked},'${status}')`;

  const result = await db.run(post_query);

  response.send("POST Successfully");
});
