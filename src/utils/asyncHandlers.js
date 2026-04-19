const asyncHandler = (requestHandler) => {
    return (req, res, next) => {
        Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err));
    };
};

export { asyncHandler };


//USING TRY CATCH BLOCKS IN EVERY ASYNC FUNCTION CAN BE TEDIOUS AND REPETITIVE. TO SIMPLIFY THIS, WE CAN CREATE A HIGHER-ORDER FUNCTION CALLED ASYNC HANDLER. THIS FUNCTION TAKES AN ASYNC FUNCTION AS AN ARGUMENT AND RETURNS A NEW FUNCTION THAT AUTOMATICALLY CATCHES ANY ERRORS AND PASSES THEM TO THE NEXT MIDDLEWARE. THIS WAY, WE CAN AVOID REPETITIVE TRY-CATCH BLOCKS THROUGHOUT OUR CODEBASE AND ENSURE CONSISTENT ERROR HANDLING.
// const asyncHandler = (fn) => {async (req,res,next)=>{
//     try{
//         await fn(req,res,next)

//     }
//     catch(err){
//         res.status(err.code ||500).json({
//             success:false,
//             message:err.message || "Internal Server Error"
//         })
//     }


// }

// }
