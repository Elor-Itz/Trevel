import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { OAuth2Client } from 'google-auth-library';
import userModel from '../models/User';
import { deleteFile } from '../utils/fileService';
import { generateToken, verifyRefreshToken } from '../utils/tokenService';
import postModel from '../models/Post';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Google sign-in
const googleSignIn = async (req: Request, res: Response) => {
    try {
        const { idToken } = req.body;
        const ticket = await client.verifyIdToken({
            idToken,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        if (!payload) {
            res.status(400).send('Invalid Google ID token');
            return;
        }

        const { sub, email, given_name, family_name, picture } = payload;
        let user = await userModel.findOne({ email });

        if (!user) {
            user = await userModel.create({
                firstName: given_name,
                lastName: family_name,
                email,
                password: sub, // Use Google sub as a placeholder password
                profilePicture: picture,
                joinDate: new Date().toISOString()
            });
        }

        const tokens = generateToken(user._id);
        if (!tokens) {
            res.status(500).send('Server Error');
            return;
        }

        if (!user.refreshToken) {
            user.refreshToken = [];
        }
        user.refreshToken.push(tokens.refreshToken);
        await user.save();

        res.status(200).send({
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            _id: user._id
        });
    } catch (err) {
        res.status(400).send(err);
        return;
    }
};

// Register function
const register = async (req: Request, res: Response) => {
    try {
        const password = req.body.password;
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const profilePicture = '/images/default-profile.png'; 
        const user = await userModel.create({
            firstName: req.body.firstName,
            lastName: req.body.lastName,
            email: req.body.email,
            password: hashedPassword,
            profilePicture,
            joinDate: new Date().toISOString        
        });
        res.status(200).send(user);
    } catch (err) {
        res.status(400).send(err);
    }
};

// Login function
const login = async (req: Request, res: Response) => {
    try {
        const user = await userModel.findOne({ email: req.body.email });
        if (!user) {
            res.status(400).send('Wrong username or password');
            return;
        }
        const validPassword = await bcrypt.compare(req.body.password, user.password);
        if (!validPassword) {
            res.status(400).send('Wrong username or password');
            return;
        }
        if (!process.env.TOKEN_SECRET) {
            res.status(500).send('Server Error');
            return;
        }
        
        // generate token
        const tokens = generateToken(user._id);
        if (!tokens) {
            res.status(500).send('Server Error');
            return;
        }
        if (!user.refreshToken) {
            user.refreshToken = [];
        }
        user.refreshToken.push(tokens.refreshToken);
        await user.save();
        res.status(200).send(
            {
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken,
                _id: user._id
            });

    } catch (err) {
        res.status(400).send(err);
    }
};

// Get user data
const getUserData = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.params.userId;
        const user = await userModel.findById(userId).select('-password');
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching user data', error });
    }
};

interface UpdateUserRequestBody {
    firstName?: string;
    lastName?: string;
    headline?: string;
    bio?: string;
    location?: string;
    website?: string;
    password?: string;
    profilePicture?: string;
}
  
// Update user data
const updateUser = async (req: Request<{ userId: string }, {}, UpdateUserRequestBody>, res: Response): Promise<void> => {
    try {
      const userId = req.params.userId;
      const user = await userModel.findById(userId);
      if (!user) {
        res.status(404).json({ message: 'User not found' });
        return;
      }
  
      // Update user details
      if (req.body.firstName !== undefined) user.firstName = req.body.firstName;
      if (req.body.lastName !== undefined) user.lastName = req.body.lastName;
      if (req.body.headline !== undefined) user.headline = req.body.headline;
      if (req.body.bio !== undefined) user.bio = req.body.bio;
      if (req.body.location !== undefined) user.location = req.body.location;
      if (req.body.website !== undefined) user.website = req.body.website;
      if (req.body.password) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(req.body.password, salt);
      }
      
      /// Update profile picture
      if (req.file || req.body.profilePicture === "") {
        // Check if the old profile picture needs to be deleted
        if (user.profilePicture && user.profilePicture !== '/images/default-profile.png') { 
            deleteFile(user.profilePicture); // Delete the old image
        }
      
        // Update the profile picture based on the input
        if (req.file) {
          user.profilePicture = `${process.env.BASE_URL}/uploads/${req.file.filename}`;
        } else {
          user.profilePicture = '/images/default-profile.png'; // Set to default image
        }
      }
      
      // Save the updated user data
      await user.save();

      // Find all posts related to this user
      const posts = await postModel.find({ sender: userId });
      if (posts.length === 0) {
        res.json(user);
        return;
      }   

      // Batch update senderName and senderImage for all posts associated with user
      const result = await postModel.updateMany(
        { sender: userId },
        { 
          $set: {
            senderName: `${user.firstName} ${user.lastName}`,
            senderImage: user.profilePicture
          }
        }
      );

      res.json(user);
    } catch (error) {
      res.status(500).json({ message: 'Error updating user data', error });
    }
};

// Logout function
const logout = async (req: Request, res: Response) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        res.status(400).json({ message: "Refresh token is required" });
        return;
    }

    try {
        const user = await verifyRefreshToken(refreshToken);        
        await user.save();
        res.status(200).send("success");
    } catch (err) {
        res.status(400).send("fail");
    }
};

// Refresh function
const refresh = async (req: Request, res: Response) => {
    try {
        const user = await verifyRefreshToken(req.body.refreshToken);
        if (!user) {
            res.status(400).send("fail");
            return;
        }
        const tokens = generateToken(user._id);

        if (!tokens) {
            res.status(500).send('Server Error');
            return;
        }
        if (!user.refreshToken) {
            user.refreshToken = [];
        }
        user.refreshToken.push(tokens.refreshToken);
        await user.save();
        res.status(200).send({
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            _id: user._id
        });
    } catch (err) {
        res.status(400).send(err);
    }
};

export default {
    register,
    googleSignIn,
    login,
    getUserData,
    updateUser,
    refresh,
    logout
};