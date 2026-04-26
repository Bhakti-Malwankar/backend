import {asyncHandler} from '../utils/asyncHandlers.js';
import {ApiError} from '../utils/ApiError.js';
import {User} from '../models/user.models.js';
import {deleteFromCloudinary, uploadToCloudinary} from '../utils/cloudinary.js';
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
    avatarPublicId:avatar.public_id,
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
    const currentUser=await User.findById(req.user?._id);
    if(!currentUser){
        throw new ApiError(404,"User not found");
    }

    const oldAvatarPublicId=currentUser.avatarPublicId;
    const avatar=await uploadToCloudinary(avatarLocalPath);
    if(!avatar?.url){
        throw new ApiError(400,"Failed to upload avatar image");
    }

    currentUser.avatar=avatar.url;
    currentUser.avatarPublicId=avatar.public_id;
    await currentUser.save({validateBeforeSave:false});

    if(oldAvatarPublicId){
        await deleteFromCloudinary(oldAvatarPublicId);
    }

    const user=await User.findById(currentUser._id).select("-password");

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

const getUserChannelProfile=asyncHandler(async(req,res)=>{
    const {username}=req.params

    if(!username?.trim()){
        throw new ApiError(400,"username is missing");
    }
   const channel=await User.aggregate([
    {
        $match:{
            username:username?.toLowerCase()
        }
    },
    {
        $lookup:{
            from:"subscriptions",
            localField:"_id",
            foreignField:"channel",
            as:"subscribers"

        }
    },
    {
        $lookup:{
            from:"subscriptions",
            localField:"_id",
            foreignField:"subscriber",
            as:"subscribedTo"
        }
    },
    {
        $addFields:{
            subscribersCount:{
                $size:"$subscribers"
            },
            channelsSubscribedToCount:{
                $size:"$subscribedTo"
            },
            isSubscribed:{
                $cond:{
                    if:{
                        $in:[req.user?._id,"$subscribers.subscriber"]
                    },
                    then:true,
                    else:false
                }
            }
        }
    },
    {
        $project:{
            fullname:1,
            username:1,
            subscribersCount:1,
            channelsSubscribedToCount:1,
            isSubscribed:1,
            avatar:1,
            coverImage:1,
            email:1
        }
    }
   ])

   if(!channel?.length){
    throw new ApiError(404,"channel not found")
   }
   return res.status(200)
   .json(
    new ApiResponse(200,channel[0],"User channel fetched successfully")
   )
})

const getWatchHistory=asyncHandler(async(req,res)=>{
    const user=await User.aggregate([
        {
            $match:{
                _id:new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
          $lookup:{
            from:"videos",
            localField:"watchHistory",
            foreignField:"_id",
            as:"watchHistory",

            pipeline:[
                {
                    $lookup:{
                        from:"users",
                        localField:"owner",
                        foreignField:"_id",
                        as:"owner",
                        pipeline:[
                            {
                                $project:{
                                    fullname:1,
                                    username:1,
                                    avatar:1
                                }
                            }
                        ]
                    }
                },
                {
                   $addFields:{
                    owner:{
                        $first:"$owner"
                    }
                   } 
                }
            ]
          }
        }
    ])

    return res.status(200)
    .json(new ApiResponse(
        200,
        user[0].watchHistory,
        "Watch history fetched successfully"
    ))
})
export {registerUser,loginUser,logoutUser,refreshAccessToken,changeCurrentUserPassword,getCurrentUser,updateAccountDetails,updateUserAvatar,updateUserCoverPhoto,getUserChannelProfile,getWatchHistory};
