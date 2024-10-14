const express = require("express")
const cors = require("cors")
const jwt = require("jsonwebtoken")
const cookieParser = require("cookie-parser")
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express()
const port = process.env.PORT || 6009
require('dotenv').config()
//middleware

app.use(cors({
  origin: ['http://localhost:5173'],
  credentials: true
}))
app.use(express.json())
app.use(cookieParser())

// middleware 
const logger = async(req, res, next)=>{
  console.log('called is', req.host, req.originalUrl)
  next()
}

const verifyToken = async(req,res, next)=>{
    const token = req.cookies?.token
    if(!token){
      return res.status(401).send({message: "not authorize"})
    }
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded)=>{
        if(err){
          return res.status(401).send({message: "unauthorize"})
        }
        console.log("value is the decoded", decoded)
        req.user = decoded
        next()
    })
  
}


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.7olulz0.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    // Json Web Token Related Api 
    app.post('/jwt', logger, async(req,res)=>{
      const user = req.body 
      console.log(user)
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {expiresIn: "1h"})
      
      res.cookie('token', token, {
        httpOnly: true, 
        secure: false,
        // maxAge: '2day', cookie ta koto din thakbe
        sameSite: 'none'
      })
      .send({success: true})
    })



    // Service Related Api
    // Collection name .eikhane data load kora ase
    const serviceCollection = client.db('carDoctor').collection('services')
    const bookingCollection = client.db('carDoctor').collection('booking')

    // ei get diye collection er data gula fetch kore client site e dekhabo
    app.get('/services', logger,  async(req, res)=>{
        const cursor = serviceCollection.find()
        const result = await cursor.toArray()
        res.send(result)
        console.log(result)
    })

  // single id gula ke dekhabo
    app.get('/services/:id', logger, async(req,res)=>{
      const id = req.params.id 
      const query = {_id: new ObjectId(id)}
      const options = {
        projection: {title: 1, service_id:1, price:1, img:1 },
      };
      const result = await serviceCollection.findOne(query, options)
      res.send(result)
    })

    // data form thake insert korbo mane form thake data gula database e post korbo
    app.post('/booking', logger, verifyToken, async(req,res)=>{
      const booking = req.body 
      console.log(booking)
      const result = await bookingCollection.insertOne(booking)
      res.send(result)
    })

    console.log(JSON.stringify());

    app.get('/booking', verifyToken, async(req,res)=>{
      // Jodi ami specific vabe email dekhte chai tahle eti use korte hobe
      console.log(req.query.email)
      if(req.query.email !== req.user.email){
        return res.status(403).send({message: "forbidden access"})
      }

      let query = {}
      if(req.query?.email) {
        query = { email: req.query.email }
      }

      const bookResult = await bookingCollection.find(query).toArray()
      res.send(bookResult)
     
    })

    // Delete Korar Get Method
    app.delete('/booking/:id', logger, async(req,res)=>{
        const id = req.params.id 
        const query = {_id : new ObjectId(id)}
        const result = await bookingCollection.deleteOne(query)
        res.send(result)
    })

    // Update / patch 
    app.patch('/booking/:id', logger, async(req,res)=>{
      const id = req.params.id
      const filter = {_id: new ObjectId(id)}
      const updateBooking = req.body 
      console.log(updateBooking)
      const updateDoc = {
        $set: {
          status: updateBooking.status
        }
      }
      const result = await bookingCollection.updateOne(filter, updateDoc)
      res.send(result)
    })
    

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);




app.get('/', (req,res)=>{
    res.send("Hello server")
})

app.listen(port, ()=>{
    console.log(`Server is Running ${port}`)
})