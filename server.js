const express = require('express')
const {open} = require("sqlite")
const sqlite3 = require("sqlite3")
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')

const path = require("path")
const dbpath = path.join(__dirname, "information.db")

const app = express()
app.use(express.json())

let db = null;
const initilizeDBAndServer = async () =>{
    try{
        db = await open({
            filename : dbpath,
            driver : sqlite3.Database
        })
        await db.run(
            `CREATE TABLE IF NOT EXISTS employees (id INTEGER PRIMARY KEY AUTOINCREMENT, Employee_Name TEXT, Employee_Designation TEXT, Salary INT)`
        )
        app.listen(3000, () => {
            console.log("Server running at http://localhost:3000/")
        })
    }
    catch(e){
        console.log(`DB Error : ${e.message}`)
        process.exit(1)
    }
}
initilizeDBAndServer()

app.get("/", (req, resp) =>{
    resp.send("Hello User")
})

// Creating User......register user api
app.post('/user/', async (request, response) =>{
    const {username, password} = request.body
    const hashedPassword = await bcrypt.hash(password, 10);
    const selectUserQuery = `SELECT * FROM users WHERE username = "${username}";`;
    const dbUser = await db.get(selectUserQuery)

    if(dbUser === undefined){
        const addUserQuery = `INSERT INTO users(username, password) VALUES ("${username}", "${hashedPassword}");`;
        await db.run(addUserQuery)
        response.send("USER ADDED")
    }else{
        response.status(400);
        response.send("User exists")
    }
})

// login user api

app.post("/login/", async (request, response) =>{
    const {username, password} = request.body
    const selectUserQuery = `SELECT * FROM users WHERE username = "${username}";`;
    const dbUser = await db.get(selectUserQuery)
    if(dbUser === undefined){
        // user doesn't exists
        response.status(400);
        response.send("Invalid User")
    }else{
        // compare password, hashed password
        const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
        if(isPasswordMatched === true){
            const payload = {username : username}
            const jwtToken = jwt.sign(payload, "asdfghjkl");
            response.send({jwtToken})
        }else{
            response.status(400);
            response.send("Invalid Password");
        }
    }
})

// Inserting employee_details
app.post('/employee/', async (request, response) =>{
    const {Employee_Name, Employee_Designation, Salary} = request.body 
    const addEmployeeQuery = `INSERT INTO employees(Employee_Name, Employee_Designation, Salary) VALUES ("${Employee_Name}", "${Employee_Designation}", ${Salary});`;
    await db.run(addEmployeeQuery);
    response.send("Added Emmployee")
})

// GET employees_details api 
app.get("/employee_details/", async(req, resp) =>{
    let jwtToken;
    const authHeader = req.headers["authorization"];
    if(authHeader !== undefined){
        jwtToken = authHeader.split(" ")[1];
    }
    if(jwtToken === undefined){
        resp.status(401)
        resp.send("Invalid Access Token")
    }else{
        jwt.verify(jwtToken, "asdfghjkl", async (error, user) =>{
            if(error){
                resp.status(401)
                resp.send("Invalid Access Token");
            }else{
                const getUserDetails = `SELECT * FROM employees;`;
                const employeeDetailsArray = await db.all(getUserDetails)
                resp.send(employeeDetailsArray);
            }
        })
    }
})