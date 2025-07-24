import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
// import jwt from "jsonwebtoken";

const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({
      validateBeforeSave: false,
    });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(500, "Failed to generate access or refresh token");
  }
};

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

const loginUser = asyncHandler(async (req, res) => {
  //get user details
  const { username, email, password } = req.body;

  if (!username && !email) {
    throw new ApiError(400, "Username or email is required");
  }

  //check if they exist - if not throw error
  const user = await User.findOne({ $or: [{ username }, { email }] });

  if (!user) {
    throw new ApiError(404, "User doesn't exist");
  }

  //password check
  const passwordCheck = await user.isPasswordCorrect(password);

  if (!passwordCheck) {
    throw new ApiError(401, "Invalid login credentials");
  }

  //generate access and refresh token
  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  //secure options for server side editing of cookies only
  const options = {
    httpOnly: true,
    secure: true,
  };

  //return response
  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "user loggin in successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  //reset refreshToken
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined,
      },
    },
    {
      new: true,
    }
  );

  //clear cookies
  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, "", "User logged out successfully"));
});

export { registerUser, loginUser, logoutUser };
