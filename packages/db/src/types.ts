import type { ObjectId } from 'mongodb';

export interface User {
	_id: ObjectId;
	clerkId: string;
	username: string;
	displayName: string;
	avatarUrl?: string;
	createdAt: Date;
	updatedAt: Date;
}

export interface Completion {
	_id: ObjectId;
	userId: ObjectId;
	clerkId: string;
	username: string;
	displayName: string;
	gameTitle: string;
	rawgId?: number;
	gameImageUrl?: string;
	completedAt: Date;
	notes?: string;
	mediaId?: ObjectId;
	mediaType?: 'image' | 'video';
	createdAt: Date;
}

export interface RawgGame {
	id: number;
	name: string;
	background_image?: string;
	released?: string;
}
