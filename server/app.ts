import FriendConcept from "./concepts/friend";
import PostConcept from "./concepts/post";
import SharingConcept from "./concepts/sharing";
import UserConcept from "./concepts/user";
import UserListConcept from "./concepts/userList";
import WebSessionConcept from "./concepts/websession";

// App Definition using concepts
export const WebSession = new WebSessionConcept();
export const User = new UserConcept();
export const Post = new PostConcept();
export const Friend = new FriendConcept();
export const UserList = new UserListConcept();
export const PostSharing = new SharingConcept("post_sharing");
