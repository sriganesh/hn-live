export interface Tag {
  id: string;
  name: string;
  userId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserTag {
  userId: string;
  tags: string[];
} 