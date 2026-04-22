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
    const [baseUri, queryString] = process.env.MONGODB_URI.split("?");
    const normalizedBaseUri = baseUri.endsWith("/") ? baseUri.slice(0, -1) : baseUri;
    const mongoUri = queryString
      ? `${normalizedBaseUri}/${process.env.DB_NAME}?${queryString}`
      : `${normalizedBaseUri}/${process.env.DB_NAME}`;

    const connectInstance = await mongoose.connect(
      mongoUri
    );
    console.log(`Connected to MongoDB successfully ${connectInstance.connection.host}`);
  } catch (err) {
    console.error("Error connecting to MongoDB:", err);
    process.exit(1);
  }
};

export default connectDB;
