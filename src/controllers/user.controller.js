import {asyncHandler} from '../utils/asyncHandlers.js';
import {ApiError} from '../utils/apiError.js';
import {User} from '../models/user.model.js';
import {uploadToCloudinary} from '../utils/cloudinary.js';
import { ApiResponse } from '../utils/ApiResponse.js';
const registerUser=asyncHandler(async(req,res)=>{
   //res.status(200).json({message:"User registered successfully"})
    const {fullname,email,username,password}=req.body;
    console.log("email: ",email);

   if([fullname,email,username,password].some(()=> field?.trim() ==="")){
    throw new ApiError("All fields are required",400);
   }

//    const userExists=await User.findOne({
//      $or:[{username},{email}]
//    })
//    if(userExists){
//     throw new ApiError("Username or email already exists",409);
//    }

const userExistsWithUsername=User.findOne({username});
const userExistsWithEmail=User.findOne({email});
if(userExistsWithEmail){
    throw new ApiError("Email already exists",409);
}
if(userExistsWithUsername){
    throw new ApiError("Username already exists",409);
}


const avatarLocalPath=req.files?.avatar[0]?.path;
const coverImageLocalPath =req.files?.coverImage[0]?.path;

if(!avatarLocalPath){
    throw new ApiError("Avatar image is required",400);
}

const avatar=await uploadToCloudinary(avatarLocalPath)
const coverImage=await uploadToCloudinary(coverImageLocalPath)

if(!avatar){
    throw new ApiError("Failed to upload avatar image",400);
}
if(!coverImage){
    throw new ApiError("Failed to upload cover image",400);
}

const user=await User.create({
    fullname,
    avatar:avatar.url,
    coverImage:coverImage?.url || "",
    email,
    username:username.toLowerCase(),
    password
})

const createdUser=await User.findById(user._id).select(
    "-password -refreshToken"
)
if(!createdUser){
    throw new ApiError("Failed to create user",500);    
}
  return res.status(201).json(new ApiResponse(200, createdUser, "User registered successfully"));
})

export {registerUser};
