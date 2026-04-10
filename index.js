const express=require('express');
const app=express();
require('dotenv').config();


app.get('/',(req,res)=>{
    res.send('Hello from Bhakti!!!');
})

app.get('/abt',(req,res)=>{
    res.send('I am a final year student pursuing B.Tech in Computer Science and Engineering ');
})
app.listen(process.env.PORT,()=>{
    console.log(`Server is running on port ${process.env.PORT}`);
})