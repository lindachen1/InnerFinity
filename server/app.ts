import FriendConcept from "./concepts/friend";
import GroupConcept from "./concepts/group";
import PostConcept from "./concepts/post";
import SharingConcept from "./concepts/sharing";
import UserConcept from "./concepts/user";
import WebSessionConcept from "./concepts/websession";

// App Definition using concepts
export const WebSession = new WebSessionConcept();
export const User = new UserConcept();
export const UserPost = new PostConcept("user_posts");
export const GroupPost = new PostConcept("group_posts");
export const Friend = new FriendConcept();
export const Group = new GroupConcept();
export const PostSharing = new SharingConcept("post_sharing");
