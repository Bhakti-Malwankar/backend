import {Router} from "express";
import {registerUser} from '../controllers/user.controller.js'
import {upload} from '../middlewares/multer.middleware.js'
import {loginUser} from '../controllers/user.controller.js'
import {verifyJWT} from '../middlewares/auth.middleware.js'
import {logoutUser} from '../controllers/user.controller.js'    
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
export default router;
