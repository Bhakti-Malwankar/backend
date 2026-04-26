import {Router} from "express";
import {
     loginUser,
     logoutUser,
     registerUser,
     refreshAccessToken,
     changeCurrentUserPassword,
     getCurrentUser,
     getWatchHistory, 
     updateAccountDetails, 
     updateUserAvatar, 
     updateUserCoverPhoto,
     getUserChannelProfile} 
    from '../controllers/user.controller.js'
import {upload} from '../middlewares/multer.middleware.js'
import {verifyJWT} from '../middlewares/auth.middleware.js'
   
const router=Router()

router.route("/register").post(
    upload.fields([
        {name:"avatar",maxCount:1},
        {name:"coverPhoto",maxCount:1}
    ]),//this the middleware that will handle the file upload and store the files in the local storage of the server
    registerUser
)

router.route("/login").post(loginUser)
//secured rutes
router.route("/logout").post(verifyJWT,logoutUser)
router.route("/refresh-token").post(refreshAccessToken)

router.route("/change-passowrd").post(verifyJWT,changeCurrentUserPassword)
router.route("/current-user").get(verifyJWT,getCurrentUser);
router.route("/update-details").patch(verifyJWT,updateAccountDetails);
router.route("/avatar").patch(verifyJWT,upload.single("avatar"),updateUserAvatar)
router.route('/cover-image').patch(verifyJWT,upload.single("/coverImage"),updateUserCoverPhoto)

router.route("/c/:username").get(verifyJWT,getUserChannelProfile)

router.route("/history").get(verifyJWT,getWatchHistory)
export default router;
