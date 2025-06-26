import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

const registerUser = asyncHandler(async (req, res) => {
  //Getting user details while registering new user
  const { fullName, email, username, password } = req.body;
  // console.log("email: ", email);

  //checking for empty fields
  if (fullName.trim() === "") {
    throw new ApiError(400, "Full Name is required!!");
  } else if (email.trim() === "") {
    throw new ApiError(400, "Email is required!!");
  } else if (username.trim() === "") {
    throw new ApiError(400, "Username is required!!");
  } else if (password.trim() === "") {
    throw new ApiError(400, "Password is required!!");
  }

  //checking if username or email id is already registered
  const existingUser = await User.findOne({
    $or: [{ username }, { email }],
  });
  if (existingUser) {
    throw new ApiError(
      409,
      "Username or email is already used by a different account"
    );
  }

  //image uploading and checking
  // console.log(req.files);
  const avatarLocalPath = req.files?.avatar[0]?.path;
  // const coverImageLocalPath = req.files?.coverImage[0]?.path;
  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar is required");
  }

  let coverImageLocalPath;

  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  //uploading on cloudinary
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);
  if (!avatar) {
    throw new ApiError(400, "File not uploaded! Try Again...");
  }

  //creation of user object and entry in database
  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase(),
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshtoken"
  );

  //checking for user creation
  if (!createdUser) {
    throw new ApiError(500, "User could not be registered. Try Again...");
  }

  //return response
  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User created succesfully!!"));
});

export { registerUser };
