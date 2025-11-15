const express = require('express');
const Task = require('../models/Task');
const auth = require('../middleware/auth');
const router = express.Router();

// @desc    Get all tasks for user with filtering and search
// @route   GET /api/tasks
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { filter, search, sort } = req.query;
    let query = { user: req.user._id };

    // Filter by status
    if (filter === 'completed') {
      query.completed = true;
    } else if (filter === 'pending') {
      query.completed = false;
    }

    // Search in title and description
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    let sortQuery = {};
    // Sort logic
    switch (sort) {
      case 'dueDate':
        sortQuery = { dueDate: 1 }; // Ascending
        break;
      case 'priority':
        // Custom sort for priority (High, Medium, Low)
        break;
      default:
        sortQuery = { createdAt: -1 }; // Newest first
    }

    const tasks = await Task.find(query).sort(sortQuery);
    
    res.json({
      success: true,
      count: tasks.length,
      data: tasks
    });
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching tasks'
    });
  }
});

// @desc    Create new task
// @route   POST /api/tasks
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    const { title, description, priority, dueDate, reminder } = req.body;

    // Validation
    if (!title) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a task title'
      });
    }

    const task = new Task({
      user: req.user._id,
      title,
      description: description || '',
      priority: priority || 'Medium',
      dueDate: dueDate || null,
      reminder: reminder || null
    });

    const createdTask = await task.save();
    
    res.status(201).json({
      success: true,
      data: createdTask,
      message: 'Task created successfully'
    });
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating task'
    });
  }
});

// @desc    Update task
// @route   PUT /api/tasks/:id
// @access  Private
router.put('/:id', auth, async (req, res) => {
  try {
    let task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Check if user owns the task
    if (task.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to update this task'
      });
    }

    const updatedTask = await Task.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      data: updatedTask,
      message: 'Task updated successfully'
    });
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating task'
    });
  }
});

// @desc    Delete task
// @route   DELETE /api/tasks/:id
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Check if user owns the task
    if (task.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to delete this task'
      });
    }

    await Task.findByIdAndDelete(req.params.id);
    
    res.json({
      success: true,
      message: 'Task deleted successfully'
    });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting task'
    });
  }
});

module.exports = router;