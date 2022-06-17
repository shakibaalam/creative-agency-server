const express = require('express');
const { MongoClient, ServerApiVersion } = require('mongodb');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const app = express();
require('dotenv').config();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: "Unauthorized Access" })
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: "Forbidden Access" })
        }
        req.decoded = decoded;
        next();
    })
};

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ey7s4.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        await client.connect();

        const userCollection = client.db("creative").collection("users");
        const projectCollection = client.db("creative").collection("projects");

        //get all users info
        app.get('/user', async (req, res) => {
            const users = await userCollection.find().toArray();
            res.send(users)
        });

        //get specific users projects
        app.get('/projects', verifyJWT, async (req, res) => {
            const email = req.query.email;
            const decodedEmail = req.decoded.email;
            if (email === decodedEmail) {
                const query = { email: email };
                const projects = await projectCollection.find(query).toArray();
                res.send(projects);
            }
            else {
                return res.status(403).send({ message: "Forbidden Access" })
            }
        });

        //add a projects
        app.post('/projects', verifyJWT, async (req, res) => {
            const project = req.body;
            const result = await projectCollection.insertOne(project);
            res.send(result);
        });

        //get a specific user
        app.get('/user/:email', async (req, res) => {
            const email = req.params.email;
            const user = await userCollection.findOne({ email: email });
            res.send(user);
        });

        //update  user info
        app.patch('/user/:email', async (req, res) => {
            const email = req.params.email;
            const userInfo = req.body;
            const filter = { email: email };
            const updateDoc = {
                $set: userInfo
            };
            const result = await userCollection.updateOne(filter, updateDoc);
            res.send(result)
        })

        //login or creating user info
        app.put('/user/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
                $set: user
            };
            const result = await userCollection.updateOne(filter, updateDoc, options);
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN, { expiresIn: '1d' });
            res.send({ result, token })
        });
    }
    finally {
        //   await client.close();
    }
}
run().catch(console.dir);;


app.get('/', (req, res) => {
    res.send('Hello everyone from creative agency!')
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})