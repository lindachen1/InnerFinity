import { PostMedia, User, UserList } from "./app";
import { AlreadyFriendsError, FriendNotFoundError, FriendRequestAlreadyExistsError, FriendRequestDoc, FriendRequestNotFoundError } from "./concepts/friend";
import { PostAuthorNotMatchError, PostDoc } from "./concepts/post";
import { SharingDoc } from "./concepts/sharing";
import { UserListDoc } from "./concepts/userList";
import { Router } from "./framework/router";

/**
 * This class does useful conversions for the frontend.
 * For example, it converts a {@link UserPostDoc} into a more readable format for the frontend.
 */
export default class Responses {
  /**
   * Convert PostDoc into more readable format for the frontend by converting the author ids into usernames.
   */
  static async post(post: PostDoc | null) {
    if (!post) {
      return post;
    }
    const authors = await User.idsToUsernames(post.authors);
    const content = await PostMedia.getMedia(post.content);
    return { ...post, content: content, authors: authors };
  }

  /**
   * Same as {@link post} but for an array of PostDoc for improved performance.
   */
  static async posts(posts: PostDoc[]) {
    const authors = await Promise.all(posts.map((post) => User.idsToUsernames(post.authors)));
    const contents = await Promise.all(posts.map((post) => PostMedia.getMedia(post.content)));
    return posts.map((post, i) => ({ ...post, content: contents[i], authors: authors[i] }));
  }

  /**
   * Convert SharingDoc into more readable format for the frontend by converting the user ids into a username.
   */
  static async sharedResource(sharedResource: SharingDoc | null) {
    if (!sharedResource) {
      return sharedResource;
    }
    const owners = await User.idsToUsernames(sharedResource.owners);
    const requested = await User.idsToUsernames(sharedResource.requestedAccess);
    const usersWithAccess = await User.idsToUsernames(sharedResource.usersWithAccess);
    const listsWithAccess = await UserList.idsToNames(sharedResource.listsWithAccess);
    return { ...sharedResource, owners: owners, requestedAccess: requested, usersWithAccess: usersWithAccess, listsWithAccess: listsWithAccess };
  }

  /**
   * Same as {@link sharedResource} but for an array of SharingDoc for improved performance.
   */
  static async sharedResources(sharedResources: SharingDoc[]) {
    const owners = await Promise.all(sharedResources.map((resource) => User.idsToUsernames(resource.owners)));
    const requested = await Promise.all(sharedResources.map(async (resource) => await User.idsToUsernames(resource.requestedAccess)));
    const usersWithAccess = await Promise.all(sharedResources.map(async (resource) => await User.idsToUsernames(resource.usersWithAccess)));
    const listsWithAccess = await Promise.all(sharedResources.map(async (resource) => await UserList.idsToNames(resource.listsWithAccess)));
    return sharedResources.map((resource, i) => ({ ...resource, owners: owners[i], requestedAccess: requested[i], usersWithAccess: usersWithAccess[i], listsWithAccess: listsWithAccess[i] }));
  }

  /**
   * Convert UserListDoc into more readable format for the frontend by converting the creator and members id into a username.
   */
  static async userList(list: UserListDoc | null) {
    if (!list) {
      return list;
    }
    const creator = await User.getUserById(list.creator);
    const members = await User.idsToUsernames(list.members);
    return { ...list, creator: creator.username, members: members };
  }

  /**
   * Same as {@link userList} but for an array of UserListDoc for improved performance.
   */
  static async userLists(lists: UserListDoc[]) {
    const creators = await User.idsToUsernames(lists.map((list) => list.creator));
    const members = await Promise.all(lists.map(async (list) => await User.idsToUsernames(list.members)));
    return lists.map((list, i) => ({ ...list, creator: creators[i], members: members[i] }));
  }

  /**
   * Convert FriendRequestDoc into more readable format for the frontend
   * by converting the ids into usernames.
   */
  static async friendRequests(requests: FriendRequestDoc[]) {
    const from = requests.map((request) => request.from);
    const to = requests.map((request) => request.to);
    const usernames = await User.idsToUsernames(from.concat(to));
    return requests.map((request, i) => ({ ...request, from: usernames[i], to: usernames[i + requests.length] }));
  }
}

Router.registerError(PostAuthorNotMatchError, async (e) => {
  const username = (await User.getUserById(e.author)).username;
  return e.formatWith(username, e._id);
});

Router.registerError(FriendRequestAlreadyExistsError, async (e) => {
  const [user1, user2] = await Promise.all([User.getUserById(e.from), User.getUserById(e.to)]);
  return e.formatWith(user1.username, user2.username);
});

Router.registerError(FriendNotFoundError, async (e) => {
  const [user1, user2] = await Promise.all([User.getUserById(e.user1), User.getUserById(e.user2)]);
  return e.formatWith(user1.username, user2.username);
});

Router.registerError(FriendRequestNotFoundError, async (e) => {
  const [user1, user2] = await Promise.all([User.getUserById(e.from), User.getUserById(e.to)]);
  return e.formatWith(user1.username, user2.username);
});

Router.registerError(AlreadyFriendsError, async (e) => {
  const [user1, user2] = await Promise.all([User.getUserById(e.user1), User.getUserById(e.user2)]);
  return e.formatWith(user1.username, user2.username);
});
