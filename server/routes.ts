import { ObjectId } from "mongodb";

import { Router, getExpressRouter } from "./framework/router";

import { Friend, Post, PostSharing, User, UserList, WebSession } from "./app";
import { UserDoc } from "./concepts/user";
import { WebSessionDoc } from "./concepts/websession";
import { includes } from "./framework/utils";
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
    const user = await User.create(username, password);
    if (!user.user) {
      throw new Error("User did not create successfully");
    }
    await UserList.createUserList("Friends", user.user._id, []);
    return user;
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
    await UserList.deleteMany({ creator: user });
    await Post.removeAuthor(user);
    await PostSharing.removeOwner(user);
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
      posts = await Post.getByAuthor(id);
    } else {
      posts = await Post.getPosts({});
    }
    return Responses.posts(posts);
  }

  @Router.get("/pendingPosts")
  async getPendingPosts() {
    const posts = await Post.getPendingPosts({});
    return Responses.posts(posts);
  }

  @Router.get("/accessablePosts")
  async getAccessablePosts(session: WebSessionDoc) {
    const user = WebSession.getUser(session);
    const targets = (await UserList.getUserLists({ members: user })).map((x) => x._id);
    targets.push(user);
    const resources = await PostSharing.getResourcesByAccessable(targets);
    const postIDs = resources.map((record) => record.resource);
    const posts = await Post.getPosts({ _id: { $in: postIDs } });
    return Responses.posts(posts);
  }

  @Router.get("/sharing")
  async getSharedResources() {
    const resources = await PostSharing.getResources({});
    return Responses.sharedResources(resources);
  }

  @Router.post("/posts")
  async createPost(session: WebSessionDoc, content: string, authors: Array<string>, allowRequests: boolean, shareWithUsers: Array<string>, shareWithLists: Array<string>) {
    const user = WebSession.getUser(session);
    const authorIds = await User.usernamesToIds(authors);
    if (!includes(authorIds, user)) {
      authorIds.push(user);
    }
    const created = await Post.create(authorIds, content);
    if (!created.post) {
      throw new Error("Post did not create successfully.");
    }
    const shareWithUserIds = await User.usernamesToIds(shareWithUsers);
    const shareWithListIds = await UserList.namesToIds(shareWithLists, user);
    for (const listId of shareWithListIds) {
      await UserList.isCreator(user, listId);
    }
    const shareWithIds = shareWithUserIds.concat(shareWithListIds);
    await PostSharing.limitSharing(authorIds, created.post._id, allowRequests, shareWithIds);
    return created;
  }

  @Router.put("/posts/:_id/approve")
  async approvePost(session: WebSessionDoc, _id: ObjectId) {
    const user = WebSession.getUser(session);
    const result = await Post.approvePost(_id, user);
    if (result.post && result.msg === "Post successfully published!") {
      await PostSharing.updateResource(_id, result.post._id);
      return { msg: "Post approved and published!", post: await Responses.post(result.post) };
    } else {
      return { msg: "Post approved, still pending other users' approval" };
    }
  }

  @Router.put("/posts/:_id/reject")
  async rejectPost(session: WebSessionDoc, _id: ObjectId) {
    const user = WebSession.getUser(session);
    return await Post.rejectPost(_id, user);
  }

  @Router.delete("/posts/:_id")
  async deletePost(session: WebSessionDoc, _id: ObjectId) {
    const user = WebSession.getUser(session);
    await Post.isAuthor(user, _id);
    await PostSharing.deleteByResourceId(_id);
    return Post.delete(_id);
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
    const userListId = await UserList.nameToId("Friends", user);
    await UserList.removeFromUserList(userListId, friendId);
    const friendUserListId = await UserList.nameToId("Friends", friendId);
    await UserList.removeFromUserList(friendUserListId, user);
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
    const userListId = await UserList.nameToId("Friends", user);
    await UserList.addToUserList(userListId, fromId);
    const friendUserListId = await UserList.nameToId("Friends", fromId);
    await UserList.addToUserList(friendUserListId, user);
    return await Friend.acceptRequest(fromId, user);
  }

  @Router.put("/friend/reject/:from")
  async rejectFriendRequest(session: WebSessionDoc, from: string) {
    const user = WebSession.getUser(session);
    const fromId = (await User.getUserByUsername(from))._id;
    return await Friend.rejectRequest(fromId, user);
  }

  @Router.get("/userLists")
  async getUserLists(session: WebSessionDoc) {
    const user = WebSession.getUser(session);
    const userLists = await UserList.getUserLists({ creator: user });
    return Responses.userLists(userLists);
  }

  @Router.post("/userLists")
  async createUserList(session: WebSessionDoc, name: string, members: Array<string>) {
    const creator = WebSession.getUser(session);
    const membersId = await User.usernamesToIds(members);
    const created = await UserList.createUserList(name, creator, membersId);
    return { msg: created.msg, userList: await Responses.userList(created.UserList) };
  }

  @Router.patch("/userLists/:_id")
  async editUserListName(session: WebSessionDoc, _id: ObjectId, name: string) {
    const creator = WebSession.getUser(session);
    await UserList.isCreator(creator, _id);
    return await UserList.editName(_id, name);
  }

  @Router.post("/userLists/:_id/members")
  async addToUserList(session: WebSessionDoc, _id: ObjectId, user: string) {
    const creator = WebSession.getUser(session);
    await UserList.isCreator(creator, _id);
    return await UserList.addToUserList(_id, (await User.getUserByUsername(user))._id);
  }

  @Router.delete("/userLists/:_id/members")
  async removeFromUserList(session: WebSessionDoc, _id: ObjectId, user: string) {
    const creator = WebSession.getUser(session);
    await UserList.isCreator(creator, _id);
    return await UserList.removeFromUserList(_id, (await User.getUserByUsername(user))._id);
  }

  @Router.delete("/userLists/:_id")
  async deleteUserList(session: WebSessionDoc, _id: ObjectId) {
    const creator = WebSession.getUser(session);
    await UserList.isCreator(creator, _id);
    return await UserList.deleteUserList(_id);
  }

  @Router.post("/sharing/:_id/requests")
  async requestAccess(session: WebSessionDoc, _id: ObjectId) {
    const user = WebSession.getUser(session);
    return await PostSharing.requestAccess(_id, user);
  }

  @Router.post("/sharing/:_id/members")
  async addAccess(session: WebSessionDoc, _id: ObjectId, user: string) {
    const userID = (await User.getUserByUsername(user))._id;
    const owner = WebSession.getUser(session);
    await PostSharing.isOwner(owner, _id);
    return await PostSharing.addAccess(_id, userID);
  }

  @Router.delete("/sharing/:_id/members")
  async removeAccess(session: WebSessionDoc, _id: ObjectId, user: string) {
    const userID = (await User.getUserByUsername(user))._id;
    const owner = WebSession.getUser(session);
    await PostSharing.isOwner(owner, _id);
    return await PostSharing.removeAccess(_id, userID);
  }
}

export default getExpressRouter(new Routes());
