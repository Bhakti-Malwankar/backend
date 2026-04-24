import {ApiError} from "../utils/ApiError.js"
import {asyncHandler} from "../utils/asyncHandlers.js"
import {jwt} from "jsonwebtoken"
import {User} from "../models/user.models.js"

export const verifyJWT=asyncHandler(async(req,res,next)=>{
   try{
    const token=req.cookies?.accessToken||req.header("Authorization")?.replace("Bearer ","")

    if(!token){
        throw new ApiError("Unauthorized access, token is missing",401);
    }
    const decodedToken=jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    const user=await User.findById(decodedToken?._id).select("-password -refreshToken");

    if(!user){
        //todo discuss abt frontend
        throw new ApiError("Unauthorized access, user not found",401);
    }
    req.user=user;
    next();
   }
    catch(error){
        throw new ApiError(401,error?.message || "Invalid access token");
    }


})