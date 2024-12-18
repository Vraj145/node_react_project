const express = require('express');
const cors = require("cors");
require('./db/config');
const User = require("./db/User");
const Product = require("./db/Product")

const Jwt = require('jsonwebtoken');
const jwtkey = 'e-comm';

const app = express();

app.use(express.json());
app.use(cors());

app.post("/register", async (req, resp) => {
    let user = new User(req.body);
    let result = await user.save();
    result = result.toObject();
    delete result.password;
    Jwt.sign({ _id: result._id }, jwtkey, { expiresIn: "2h" }, (err, token) => {
        if (err) {
            resp.send({ result: "something went wrong, Please try after sometime" });
        } else {
            resp.send({ result, auth: token });
        }
    });
});


app.post("/login", async (req, resp) => {
    if (req.body.password && req.body.email) {
        let user = await User.findOne(req.body).select("-password");
        if (user) {
            Jwt.sign({ _id: user._id }, jwtkey, { expiresIn: "2h" }, (err, token) => {
                if (err) {
                    resp.send({ result: "something went wrong, Please try after sometime" });
                } else {
                    resp.send({ user, auth: token });
                }
            });
        } else {
            resp.send({ result: "No User Found" });
        }
    } else {
        resp.send({ result: "Invalid Login Details" });
    }
});


app.post("/add-product", verifyToken, async (req, resp) => {
    let product = new Product({
        ...req.body,
        userId: req.userId // Associate product with logged-in user
    });
    let result = await product.save();
    resp.send(result);
});


app.get("/products", verifyToken, async (req, resp) => {
    let products = await Product.find({ userId: req.userId });
    if (products.length > 0) {
        resp.send(products);
    } else {
        resp.send({ result: "No Products Found" });
    }
});


app.delete("/product/:id", verifyToken, async (req, resp) => {
    const result = await Product.deleteOne({ _id: req.params.id });
    resp.send(result);
});

app.get("/product/:id", verifyToken, async (req, resp) => {
    let result = await Product.findOne({ _id: req.params.id });
    if (result) {
        resp.send(result);
    } else {
        resp.send({ result: "No Record Found." })
    }
});

app.put("/product/:id", verifyToken, async (req, resp) => {
    let result = await Product.updateOne(
        { _id: req.params.id },
        {
            $set: req.body
        }
    );
    resp.send(result);
});

app.get("/search/:key", verifyToken, async (req, resp) => {
    let result = await Product.find({
        userId: req.userId, // Filter by userId
        "$or": [
            { name: { $regex: req.params.key, $options: "i" } },
            { price: { $regex: req.params.key, $options: "i" } },
            { category: { $regex: req.params.key, $options: "i" } },
            { company: { $regex: req.params.key, $options: "i" } }
        ]
    });
    resp.send(result);
});


function verifyToken(req, resp, next) {
    let token = req.headers['authorization'];
    if (token) {
        token = token.split(' ')[1];
        Jwt.verify(token, jwtkey, (err, valid) => {
            if (err) {
                resp.status(401).send({ result: "Please provide a valid token" });
            } else {
                req.userId = valid._id; // Extract user ID from the token
                next();
            }
        });
    } else {
        resp.status(403).send({ result: "Please add token with header" });
    }
}


app.listen(5000);
