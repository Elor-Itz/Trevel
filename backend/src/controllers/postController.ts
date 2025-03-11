import { Request, Response } from "express";
import mongoose from "mongoose";
import postModel, { IPost } from "../models/Post";
import userModel from "../models/User";
import commentsModel from "../models/Comment";
import BaseController from "./baseController";
import fs from "fs";
import path from "path";

class PostsController extends BaseController<IPost> {
  constructor() {
      super(postModel);
  }

  // Create a new post
  async createItem(req: Request, res: Response) {
    try {
      const userId = req.params.userId;      
      const user = await userModel.findById(userId);
      const images = req.files ? (req.files as Express.Multer.File[]).map(file => `${process.env.BASE_URL}/uploads/${file.filename}`) : [];      
      const post: IPost = {
        ...req.body,
        sender: new mongoose.Types.ObjectId(userId),
        senderName: user ? `${user.firstName} ${user.lastName}` : "Unknown",
        senderImage: user?.profilePicture,
        likes: [],
        likesCount: 0,  
        images,      
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      req.body = post;      
      await super.createItem(req, res);
    } catch (error) {
      if (error instanceof Error) {
        res.status(500).json({ error: error.message });
      } else {
        res.status(500).json({ error: "An unknown error occurred" });
      }
    }
  }

  // Update post
  async updateItem(req: Request, res: Response): Promise<void> {
    try {
      const postId = req.params.id;
      const post = await postModel.findById(postId);
      if (!post) {
        res.status(404).json({ error: "Post not found" });
        return;
      }
      
      // Handle new images
      const newImages = req.files ? (req.files as Express.Multer.File[]).map(file => file.path) : [];
      const existingImages = req.body.existingImages ? req.body.existingImages : post.images;

      // Remove images that are not in the existingImages array
      const imagesToRemove = (post.images || []).filter(image => !existingImages.includes(image));
      imagesToRemove.forEach(image => {
        fs.unlinkSync(`${process.env.BASE_URL}/uploads/${image}`);
      });

      const updatedImages = [...existingImages, ...newImages];

      req.body = { ...req.body, images: updatedImages, updatedAt: new Date().toISOString() };
      await super.updateItem(req, res);
    } catch (error) {
      if (error instanceof Error) {
        res.status(500).json({ error: error.message });
      } else {
        res.status(500).json({ error: "An unknown error occurred" });
      }
    }
  }

  // Delete post
  async deleteItem(req: Request, res: Response) {
    try {
      const postId = req.params.id;
      const post = await postModel.findById(postId);
      if (post) {
        // Remove all images associated with the post
        post.images?.forEach(image => {
          const imagePath = path.join(__dirname, "../../uploads", path.basename(image));
          if (fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
          }
        });
      } 
      await commentsModel.deleteMany({ postId });
      await super.deleteItem(req, res);
    } catch (error) {        
        if (error instanceof Error) {
          res.status(500).json({ error: error.message });
        } else {
          res.status(500).json({ error: "An unknown error occurred" });
        }
    }
  }
}  

export default new PostsController();