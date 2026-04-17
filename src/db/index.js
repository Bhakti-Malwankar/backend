// import mongoose from "mongoose";
// import { DB_NAME } from "../constants.js";


// const connectDB=async()=>{
//     try{
//       const connectInstance=await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
//       console.log(`Connected to MongoDB successfully  ${connectInstance.connection.host}`);
//     }
//     catch(err){
//         console.error("Error connecting to MongoDB:", err);
//         process.exit(1);
//     }
// }
// export default connectDB;

import mongoose from "mongoose";

const connectDB = async () => {
  try {
    const connectInstance = await mongoose.connect(
      `${process.env.MONGODB_URI}/${process.env.DB_NAME}`
    );
    console.log(`Connected to MongoDB successfully ${connectInstance.connection.host}`);
  } catch (err) {
    console.error("Error connecting to MongoDB:", err);
    process.exit(1);
  }
};

export default connectDB;
