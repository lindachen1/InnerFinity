import { ObjectId } from "mongodb";

import { Router, getExpressRouter } from "./framework/router";

import { Friend, Group, GroupPost, PostSharing, User, UserPost, WebSession } from "./app";
import { PostOptions } from "./concepts/post";
import { UserDoc } from "./concepts/user";
import { WebSessionDoc } from "./concepts/websession";
import Responses from "./responses";

class Routes {
  @Router.get("/session")
  async getSessionUser(session: WebSessionDoc) {
    const user = WebSession.getUser(session);
    return await User.getUserById(user);
  }

  @Router.get("/users")
  async getUsers() {
    return await User.getUsers();
  }

  @Router.get("/users/:username")
  async getUser(username: string) {
    return await User.getUserByUsername(username);
  }

  @Router.post("/users")
  async createUser(session: WebSessionDoc, username: string, password: string) {
    WebSession.isLoggedOut(session);
    return await User.create(username, password);
  }

  @Router.patch("/users")
  async updateUser(session: WebSessionDoc, update: Partial<UserDoc>) {
    const user = WebSession.getUser(session);
    return await User.update(user, update);
  }

  @Router.delete("/users")
  async deleteUser(session: WebSessionDoc) {
    const user = WebSession.getUser(session);
    WebSession.end(session);
    return await User.delete(user);
  }

  @Router.post("/login")
  async logIn(session: WebSessionDoc, username: string, password: string) {
    const u = await User.authenticate(username, password);
    WebSession.start(session, u._id);
    return { msg: "Logged in!" };
  }

  @Router.post("/logout")
  async logOut(session: WebSessionDoc) {
    WebSession.end(session);
    return { msg: "Logged out!" };
  }

  @Router.get("/posts")
  async getPosts(author?: string) {
    let posts;
    if (author) {
      const id = (await User.getUserByUsername(author))._id;
      posts = await UserPost.getByAuthor(id);
    } else {
      posts = await UserPost.getPosts({});
    }
    return Responses.posts(posts);
  }

  @Router.get("/accessablePosts")
  async getAccessablePosts(session: WebSessionDoc) {
    const user = WebSession.getUser(session);
    const postIDs = (await PostSharing.getResourcesByUser(user)).map((record) => record.resource);
    const posts = await UserPost.getPosts({ _id: { $in: postIDs } });
    return Responses.posts(posts);
  }

  @Router.post("/posts")
  async createPost(session: WebSessionDoc, content: string, allowRequests: string, options?: PostOptions) {
    const user = WebSession.getUser(session);
    const created = await UserPost.create(user, content, [], options);
    if (!created.post) {
      throw new Error("Post did not create successfully.");
    }
    await PostSharing.limitSharing(user, created.post._id, allowRequests === "Y", []);
    return { msg: created.msg, post: await Responses.post(created.post) };
  }

  @Router.post("/posts/groupPost")
  async createGroupPost(session: WebSessionDoc, content: string, group: ObjectId, options?: PostOptions) {
    const user = WebSession.getUser(session);
    await Group.isMember(user, group);
    const requiresApproval = await Group.getMembers(group);
    const created = await GroupPost.create(group, content, requiresApproval, options);
    if (!created) {
      throw new Error("Post did not create successfully.");
    }
    return created;
  }

  @Router.put("/posts/groupPost/approve")
  async approveGroupPost(session: WebSessionDoc, _id: ObjectId) {
    const user = WebSession.getUser(session);
    const result = await GroupPost.approvePost(_id, user);
    if (result.post) {
      return { msg: "Post approved and published!", post: await Responses.post(result.post) };
    } else {
      return { msg: "Post approved, still pending other users' approval" };
    }
  }

  // @Router.patch("/posts/:_id")
  // async updatePost(session: WebSessionDoc, _id: ObjectId, update: Partial<PostDoc>) {
  //   const user = WebSession.getUser(session);
  //   await UserPost.isAuthor(user, _id);
  //   return await UserPost.update(_id, update);
  // }

  @Router.delete("/posts/:_id")
  async deletePost(session: WebSessionDoc, _id: ObjectId) {
    const user = WebSession.getUser(session);
    await UserPost.isAuthor(user, _id);
    await PostSharing.deleteByResourceId(_id);
    return UserPost.delete(_id);
  }

  @Router.get("/friends")
  async getFriends(session: WebSessionDoc) {
    const user = WebSession.getUser(session);
    return await User.idsToUsernames(await Friend.getFriends(user));
  }

  @Router.delete("/friends/:friend")
  async removeFriend(session: WebSessionDoc, friend: string) {
    const user = WebSession.getUser(session);
    const friendId = (await User.getUserByUsername(friend))._id;
    return await Friend.removeFriend(user, friendId);
  }

  @Router.get("/friend/requests")
  async getRequests(session: WebSessionDoc) {
    const user = WebSession.getUser(session);
    return await Responses.friendRequests(await Friend.getRequests(user));
  }

  @Router.post("/friend/requests/:to")
  async sendFriendRequest(session: WebSessionDoc, to: string) {
    const user = WebSession.getUser(session);
    // Will be changed so that the input (to) is the ID, rather than username
    // but keeping it as is for now for convenience
    const toId = (await User.getUserByUsername(to))._id;
    return await Friend.sendRequest(user, toId);
  }

  @Router.delete("/friend/requests/:to")
  async removeFriendRequest(session: WebSessionDoc, to: string) {
    const user = WebSession.getUser(session);
    const toId = (await User.getUserByUsername(to))._id;
    return await Friend.removeRequest(user, toId);
  }

  @Router.put("/friend/accept/:from")
  async acceptFriendRequest(session: WebSessionDoc, from: string) {
    const user = WebSession.getUser(session);
    const fromId = (await User.getUserByUsername(from))._id;
    return await Friend.acceptRequest(fromId, user);
  }

  @Router.put("/friend/reject/:from")
  async rejectFriendRequest(session: WebSessionDoc, from: string) {
    const user = WebSession.getUser(session);
    const fromId = (await User.getUserByUsername(from))._id;
    return await Friend.rejectRequest(fromId, user);
  }

  @Router.get("/groups")
  async getGroups() {
    const groups = await Group.getGroups({});
    return Responses.groups(groups);
  }

  @Router.post("/groups")
  async createGroup(session: WebSessionDoc, name: string) {
    const creator = WebSession.getUser(session);
    const created = await Group.createGroup(name, creator);
    return { msg: created.msg, group: await Responses.group(created.group) };
  }

  @Router.patch("/groups/:_id")
  async editGroupName(session: WebSessionDoc, _id: ObjectId, name: string) {
    const creator = WebSession.getUser(session);
    await Group.isCreator(creator, _id);
    return await Group.editName(_id, name);
  }

  @Router.post("/groups/:_id/members")
  async addToGroup(session: WebSessionDoc, _id: ObjectId, user: string) {
    const creator = WebSession.getUser(session);
    await Group.isCreator(creator, _id);
    return await Group.addToGroup(_id, (await User.getUserByUsername(user))._id);
  }

  @Router.delete("/groups/:_id/members")
  async removeFromGroup(session: WebSessionDoc, _id: ObjectId, user: string) {
    const creator = WebSession.getUser(session);
    await Group.isCreator(creator, _id);
    return await Group.removeFromGroup(_id, (await User.getUserByUsername(user))._id);
  }

  @Router.get("/sharedResources")
  async getSharedResources() {
    const resources = await PostSharing.getSharedResources({});
    return Responses.sharedResources(resources);
  }

  @Router.post("/posts/:_id/requests")
  async requestAccess(session: WebSessionDoc, _id: ObjectId) {
    const user = WebSession.getUser(session);
    return await PostSharing.requestAccess(_id, user);
  }

  @Router.post("/posts/:_id/members")
  async addAccess(session: WebSessionDoc, _id: ObjectId, user: string) {
    console.log("running");
    const userID = (await User.getUserByUsername(user))._id;
    const owner = WebSession.getUser(session);
    await PostSharing.isOwner(owner, _id);
    return await PostSharing.addAccess(_id, userID);
  }

  @Router.delete("/posts/:_id/members")
  async removeAccess(session: WebSessionDoc, _id: ObjectId, user: string) {
    const userID = (await User.getUserByUsername(user))._id;
    const owner = WebSession.getUser(session);
    await PostSharing.isOwner(owner, _id);
    return await PostSharing.removeAccess(_id, userID);
  }

  // @Router.post("/groups/:_id/requests")

  // @Router.get("/profiles/:_id")
  // async getProfile(session: WebSessionDoc, _id: ObjectId) {
  //   throw new Error("not implemented");
  // }
}

export default getExpressRouter(new Routes());
