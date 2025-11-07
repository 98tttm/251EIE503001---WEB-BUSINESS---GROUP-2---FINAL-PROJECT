/**
 * Standardized API response utilities
 */

class ApiResponse {
  /**
   * Send success response
   */
  static success(res, data = null, message = 'Success', statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      data,
      message,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Send success response with pagination
   */
  static successWithPagination(res, data, pagination, message = 'Success') {
    return res.status(200).json({
      success: true,
      data,
      pagination: {
        page: pagination.page || 1,
        limit: pagination.limit || 20,
        total: pagination.total || 0,
        totalPages: Math.ceil((pagination.total || 0) / (pagination.limit || 20))
      },
      message,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Send error response
   */
  static error(res, message = 'Error occurred', statusCode = 500, errorCode = null, details = null) {
    const response = {
      success: false,
      error: {
        message,
        code: errorCode,
        details
      },
      timestamp: new Date().toISOString()
    };

    // Remove null/undefined fields
    if (!errorCode) delete response.error.code;
    if (!details) delete response.error.details;

    return res.status(statusCode).json(response);
  }

  /**
   * Send validation error response
   */
  static validationError(res, errors) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: errors
      },
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Send not found error
   */
  static notFound(res, resource = 'Resource') {
    return res.status(404).json({
      success: false,
      error: {
        message: `${resource} not found`,
        code: 'NOT_FOUND'
      },
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Send unauthorized error
   */
  static unauthorized(res, message = 'Unauthorized access') {
    return res.status(401).json({
      success: false,
      error: {
        message,
        code: 'UNAUTHORIZED'
      },
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Send forbidden error
   */
  static forbidden(res, message = 'Access forbidden') {
    return res.status(403).json({
      success: false,
      error: {
        message,
        code: 'FORBIDDEN'
      },
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Send bad request error
   */
  static badRequest(res, message = 'Bad request', details = null) {
    return res.status(400).json({
      success: false,
      error: {
        message,
        code: 'BAD_REQUEST',
        details
      },
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Send conflict error
   */
  static conflict(res, message = 'Resource conflict', details = null) {
    return res.status(409).json({
      success: false,
      error: {
        message,
        code: 'CONFLICT',
        details
      },
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Send internal server error
   */
  static serverError(res, message = 'Internal server error') {
    return res.status(500).json({
      success: false,
      error: {
        message,
        code: 'INTERNAL_ERROR'
      },
      timestamp: new Date().toISOString()
    });
  }
}

module.exports = ApiResponse;

