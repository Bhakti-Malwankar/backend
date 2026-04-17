import dotenv from "dotenv";

import connectDB from "./db/index.js";

dotenv.config({
    path: './.env'
});
 connectDB();






/* FIRST APPROACH

import express from "express";
const app=express();


(async()=>{
    try{
        await mongoose.connect(`${process.env.MONOGODB_URI}/${DB_NAME}`)
        app.on("error",(err)=>{
            console.error("Error connecting to MongoDB",err);
            throw err;
        })
        app.listen(process.env.PORT,()=>{
            console.log(`Server is running on port ${process.env.PORT}`);
        })
    }
    catch(err){
        console.error("Error connecting to MongoDB:", err);
        throw err;
    }


})()
    */