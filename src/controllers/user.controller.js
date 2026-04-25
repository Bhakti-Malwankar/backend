import {asyncHandler} from '../utils/asyncHandlers.js';
import {ApiError} from '../utils/ApiError.js';
import {User} from '../models/user.models.js';
import {uploadToCloudinary} from '../utils/cloudinary.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import jwt from 'jsonwebtoken';


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
        throw new ApiError(500,"Failed to generate tokens");
    }
}

const registerUser=asyncHandler(async(req,res)=>{
   //res.status(200).json({message:"User registered successfully"})
    const {fullname,email,username,password}=req.body;
    console.log("email: ",email);

   if([fullname,email,username,password].some((field)=> field?.trim() ==="")){
    throw new ApiError(400,"All fields are required");
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
    throw new ApiError(409,"Email already exists");
}
if(userExistsWithUsername){
    throw new ApiError(409,"Username already exists");
}


const avatarLocalPath=req.files?.avatar[0]?.path;
//const coverPhotoLocalPath =req.files?.coverPhoto[0]?.path;

let coverPhotoLocalPath;
//check with classic condition
if(req.files && Array.isArray(req.files.coverPhoto) && req.files.coverPhoto.length > 0){
    coverPhotoLocalPath=req.files.coverPhoto[0].path;
}
if(!avatarLocalPath){
    throw new ApiError(400,"Avatar image is required");
}

const avatar=await uploadToCloudinary(avatarLocalPath)
const coverPhoto=coverPhotoLocalPath
    ? await uploadToCloudinary(coverPhotoLocalPath)
    : null

if(!avatar){
    throw new ApiError(400,"Failed to upload avatar image");
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
    throw new ApiError(500,"Failed to create user");    
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
    if(!username && !email){
        throw new ApiError(400,"Username or email is required");
    }
   const user=await User.findOne({$or:[{username},{email}]})
    if(!user){
        throw new ApiError(404,"User not found");
    }
    const isPasswordValid= await user.isPasswordCorrect(password);
     if(!isPasswordValid){
        throw new ApiError(401,"Invalid password");
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

const refreshAccessToken=asyncHandler(async(res,req)=>{
   const incomingRefreshToken= req.cookies.refreshToken||req.body.refreshToken

   if(!incomingRefreshToken){
    throw new ApiError(401,"Unauthorised request, refresh token is missing");
   }

  try{
    const decodedToken=jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
  const user=await User.findById(decodedToken?._id)
  if(!user){
    throw new ApiError(401,"Invalid refresh token, user not found");
  }
  if(user?.refreshToken !== incomingRefreshToken){
    throw new ApiError(401,"refresh token expired or used");
  }
 const options={
    httpOnly:true,
    secure:true,
 }
 const {accessToken,newRefreshToken}=await User.generateAccessAndRefreshTokens(user._id);

return res.status(200)
.cookie("accessToken", accessToken, options)
.cookie("refreshToken", newRefreshToken, options)
.json(new ApiResponse(200,{accessToken,newRefreshToken},"Access token refreshed successfully"))

  }
  catch(error){
    throw new ApiError(401,error?.message || "Invalid refresh token");
  }
  
}) 

const changeCurrentUserPassword=asyncHandler(async(req,res)=>{
const{oldPassword,newPassword,confirmPassword}=req.body;
  if(newPassword !== confirmPassword){
    throw new ApiError(400,"New password and confirm password do not match");
  }
  const  user = await User.findById(req.user?._id)
  const isPasswordCorrect= await user.isPasswordCorrect(oldPassword)
    if(!isPasswordCorrect){
        throw new ApiError(400,"Old password is incorrect");
    }
    user.password=newPassword;
    await user.save({validateBeforeSave:false});

    return  res.status(200).json(new ApiResponse(200,{},"Password changed successfully"))


})
  
const getCurrentUser=asyncHandler(async(req,res)=>{
    return res.status(200).json(new ApiResponse(200,req.user,"Current user fetched successfully"))
})

const updateAccountDetails=asyncHandler(async(req,res)=>{
    const{fullname,email}=req.body;
    if(!fullname || !email){
        throw new ApiError(400,"All fields are required");
    }
    const user=await User.findByIdAndUpdate(req.user?._id, 
        {
          $set:
           { fullname,
             email:email
            }
        },
        {new:true}
    ).select("-password");

    return res.status(200).json(new ApiResponse(200,user,"Account details updated successfully"))

})

const updateUserAvatar=asyncHandler(async(req,res)=>{
    const avatarLocalPath=req.file?.path
    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar image is required");
    }
    const avatar=await uploadToCloudinary(avatarLocalPath);
    if(!avatar.url){
        throw new ApiError(400,"Failed to upload avatar image");
    }
    const user=await User.findByIdAndUpdate(req.user?._id,

        {
            $set:{
                avatar:avatar.url
            }

        },
        {
            new:true
        }
    ).select("-password");

        return res.status(200).json(new ApiResponse(200,user,"Avatar updated successfully"))
})

const updateUserCoverPhoto=asyncHandler(async(req,res)=>{
    const coverImageLocalPath=req.file?.path
    if(!coverImageLocalPath){
        throw new ApiError(400,"Cover photo is required");
    }
    const coverImage=await uploadToCloudinary(coverImageLocalPath);
    if(!coverImage.url){
        throw new ApiError(400,"Failed to upload cover image");
    }
    const user=await User.findByIdAndUpdate(req.user?._id,


        {
            $set:{
                coverImage:coverImage.url
            }

        },
        {
            new:true
        }
    ).select("-password");

        return res.status(200).json(new ApiResponse(200,user,"Cover photo updated successfully"))   
})

export {registerUser,loginUser,logoutUser,refreshAccessToken,changeCurrentUserPassword,getCurrentUser,updateAccountDetails,updateUserAvatar,updateUserCoverPhoto};
