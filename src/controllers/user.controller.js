import {asyncHandler} from '../utils/asyncHandlers.js';
import {ApiError} from '../utils/apiError.js';
import {User} from '../models/user.models.js';
import {uploadToCloudinary} from '../utils/cloudinary.js';
import { ApiResponse } from '../utils/ApiResponse.js';



const generateAccessAndRefreshTokens=async(userId)=>{
    try{
        const user=await User.findById(userId);
        const accessToken=user.generateAccessToken();
        const refreshToken=user.generateRefreshToken();
       
        user.refreshToken=refreshToken;
        await user.save({validateBeforeSave:false});
        return {accessToken, refreshToken};
        
    }
    catch(error){
        throw new ApiError("Failed to generate tokens",500);
    }
}

const registerUser=asyncHandler(async(req,res)=>{
   //res.status(200).json({message:"User registered successfully"})
    const {fullname,email,username,password}=req.body;
    console.log("email: ",email);

   if([fullname,email,username,password].some((field)=> field?.trim() ==="")){
    throw new ApiError("All fields are required",400);
   }

//    const userExists=await User.findOne({
//      $or:[{username},{email}]
//    })
//    if(userExists){
//     throw new ApiError("Username or email already exists",409);
//    }

const userExistsWithUsername=await User.findOne({username});
const userExistsWithEmail=await User.findOne({email});
if(userExistsWithEmail){
    throw new ApiError("Email already exists",409);
}
if(userExistsWithUsername){
    throw new ApiError("Username already exists",409);
}


const avatarLocalPath=req.files?.avatar[0]?.path;
//const coverPhotoLocalPath =req.files?.coverPhoto[0]?.path;

let coverPhotoLocalPath;
//check with classic condition
if(req.files && Array.isArray(req.files.coverPhoto) && req.files.coverPhoto.length > 0){
    coverPhotoLocalPath=req.files.coverPhoto[0].path;
}
if(!avatarLocalPath){
    throw new ApiError("Avatar image is required",400);
}

const avatar=await uploadToCloudinary(avatarLocalPath)
const coverPhoto=coverPhotoLocalPath
    ? await uploadToCloudinary(coverPhotoLocalPath)
    : null

if(!avatar){
    throw new ApiError("Failed to upload avatar image",400);
}
// if(!coverPhoto){
//     throw new ApiError("Failed to upload cover image",400);
// }

const user=await User.create({
    fullname,
    avatar:avatar.url,
    coverImage:coverPhoto?.url || "",
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


const loginUser= asyncHandler(async(req,res)=>{
    //take the username and password from req.body
    //valiadte the credentials
    //find the user 
    //if user exist check password is correct or not
    //generate a access token and the refresh token 
    //send the token to client in form of cookies

    const {email,username,password}=req.body;
    if(!username || !email){
        throw new ApiError("Username or email is required",400);
    }
   const user=await User.findOne({$or:[{username},{email}]})
    if(!user){
        throw new ApiError("User not found ",404);
    }
    const isPasswordValid= await user.isPasswordCorrect(password);
     if(!isPasswordValid){
        throw new ApiError("Invalid password",401);
     }

    const {accessToken, refreshToken}=await generateAccessAndRefreshTokens(user._id);

    const loggedInUser=await User.findById(user._id).
    select("-password -refreshToken");

    const options={
        httpOnly:true,
        secure:true,
    }
    

    return res.status(200).cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse
        (200,
            {
            user:loggedInUser,
            accessToken,
            refreshToken
         },
         "User logged in successfully"
        )
    )
})

const logoutUser=asyncHandler(async(req,res)=>{
   await User.findByIdAndUpdate(
     req.user._id,
     {
        $set:
        {
            refreshToken:undefined 
        }
     },
     {
        new:true
     }
   ) 
   const options={
    httpOnly:true,
    secure:true,
   }
   return res.status(200)
   .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200,{},"User logged out successfully")) 

})


        
    



export {registerUser,loginUser,logoutUser};
