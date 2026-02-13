/**
 * User Profile API Types
 *
 * Types for user profile and business settings management.
 * @see /api/v1/users endpoint
 */

/**
 * Response from user profile endpoints
 * @see GET /api/v1/users/{user_id}
 * @see PUT /api/v1/users/{user_id}
 */
export interface UserProfileResponse {
	id: string;
	first_name: string;
	last_name: string;
	email: string;
	/** Account-level business name */
	business_name: string | null;
	/** Presigned S3 URL for account logo (expires in 1 hour) */
	logo_url: string | null;
	created_at: string;
	updated_at: string;
}

/**
 * Request body for updating user profile
 * @see PUT /api/v1/users/{user_id}
 */
export interface UpdateBusinessNameRequest {
	/** Business name displayed on all booths (max 255 chars) */
	business_name: string;
}

/**
 * Response from logo upload endpoints
 * Shared by account logo and booth logo uploads
 * @see PUT /api/v1/users/{user_id}/logo
 * @see PUT /api/v1/booths/{booth_id}/logo
 */
export interface LogoUploadResponse {
	/** Presigned S3 URL for the uploaded logo */
	logo_url: string;
	/** S3 object key for the logo */
	s3_key: string;
}

/**
 * Response from logo delete endpoints
 * Shared by account logo and booth logo deletes
 * @see DELETE /api/v1/users/{user_id}/logo
 * @see DELETE /api/v1/booths/{booth_id}/logo
 */
export interface LogoDeleteResponse {
	message: string;
}
