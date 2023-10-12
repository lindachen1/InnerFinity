import CommentConcept from "./concepts/comment";
import FriendConcept from "./concepts/friend";
import MediaConcept from "./concepts/media";
import PostConcept from "./concepts/post";
import SharingConcept from "./concepts/sharing";
import UserConcept from "./concepts/user";
import UserListConcept from "./concepts/userList";
import WebSessionConcept from "./concepts/websession";

// App Definition using concepts
export const WebSession = new WebSessionConcept();
export const User = new UserConcept();
export const Post = new PostConcept();
export const Comment = new CommentConcept();
export const Friend = new FriendConcept();
export const UserList = new UserListConcept();
export const PostSharing = new SharingConcept("postSharing");
export const CommentSharing = new SharingConcept("commentSharing");
export const PostMedia = new MediaConcept("postMedia");
