import { 
  createPost as createPostService,
  getAllPosts as getAllPostsService,
  getPostById as getPostByIdService,
  updatePost as updatePostService,
  deletePost as deletePostService,
  getPostsByUserId as getPostsByUserIdService,
  searchPosts as searchPostsService,
  getPostStats as getPostStatsService
} from '../services/postService.js';

export const createPost = async (req, res, next) => {
  try {
    const postData = req.body;

    // Validation
    if (!postData.title) {
      return res.status(400).json({
        message: "Post title is required",
      });
    }

    if (!postData.content && !postData.description) {
      return res.status(400).json({
        message: "Post content or description is required",
      });
    }

    // Add user information from auth middleware
    if (req.user) {
      postData.userId = req.user._id;
      postData.userName = req.user.name;
      postData.userEmail = req.user.email;
    }

    const post = await createPostService(postData);
    res.status(201).json(post);
  } catch (error) {
    if (error.message === 'Post not created') {
      return res.status(400).json({
        message: error.message,
      });
    }
    next(error);
  }
};

export const getAllPosts = async (req, res, next) => {
  try {
    const queryParams = req.query;
    const result = await getAllPostsService(queryParams);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const getPostById = async (req, res, next) => {
  try {
    const { postId } = req.params;

    if (!postId) {
      return res.status(400).json({
        message: "postId is required",
      });
    }

    const post = await getPostByIdService(postId);
    res.status(200).json(post);
  } catch (error) {
    if (error.message === 'Post not found') {
      return res.status(404).json({
        message: error.message,
      });
    }
    
    if (error.message === 'Invalid post ID format') {
      return res.status(400).json({
        message: error.message,
      });
    }
    
    next(error);
  }
};

export const updatePost = async (req, res, next) => {
  try {
    const { postId } = req.params;
    const updateData = req.body;

    if (!postId) {
      return res.status(400).json({
        message: "postId is required",
      });
    }

    if (!updateData || Object.keys(updateData).length === 0) {
      return res.status(400).json({
        message: "Update data is required",
      });
    }

    // Remove sensitive fields that shouldn't be updated directly
    delete updateData.createdAt;
    delete updateData._id;
    delete updateData.userId; // Prevent changing post ownership

    const result = await updatePostService(postId, updateData);
    res.status(200).json(result);
  } catch (error) {
    if (error.message === 'Post not found or updated') {
      return res.status(404).json({
        message: error.message,
      });
    }
    
    if (error.message === 'Invalid post ID format') {
      return res.status(400).json({
        message: error.message,
      });
    }
    
    next(error);
  }
};

export const deletePost = async (req, res, next) => {
  try {
    const { postId } = req.params;

    if (!postId) {
      return res.status(400).json({
        message: "postId is required",
      });
    }

    const result = await deletePostService(postId);
    res.status(200).json({
      message: "Post deleted successfully",
      result
    });
  } catch (error) {
    if (error.message === 'Post not found or deleted') {
      return res.status(404).json({
        message: error.message,
      });
    }
    
    if (error.message === 'Invalid post ID format') {
      return res.status(400).json({
        message: error.message,
      });
    }
    
    next(error);
  }
};

export const getPostsByUserId = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const queryParams = req.query;

    if (!userId) {
      return res.status(400).json({
        message: "userId is required",
      });
    }

    const result = await getPostsByUserIdService(userId, queryParams);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const searchPosts = async (req, res, next) => {
  try {
    const { q: searchTerm } = req.query;
    const filters = req.query;

    if (!searchTerm) {
      return res.status(400).json({
        message: "Search term (q) is required",
      });
    }

    const posts = await searchPostsService(searchTerm, filters);
    res.status(200).json({
      searchTerm,
      totalResults: posts.length,
      posts
    });
  } catch (error) {
    next(error);
  }
};

export const getPostStats = async (req, res, next) => {
  try {
    const { postId } = req.params;

    if (!postId) {
      return res.status(400).json({
        message: "postId is required",
      });
    }

    const stats = await getPostStatsService(postId);
    res.status(200).json(stats);
  } catch (error) {
    if (error.message === 'Post not found') {
      return res.status(404).json({
        message: error.message,
      });
    }
    
    next(error);
  }
};