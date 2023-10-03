import { User } from "./app";
import { AlreadyFriendsError, FriendNotFoundError, FriendRequestAlreadyExistsError, FriendRequestDoc, FriendRequestNotFoundError } from "./concepts/friend";
import { GroupDoc } from "./concepts/group";
import { PostAuthorNotMatchError, PostDoc } from "./concepts/post";
import { SharingDoc } from "./concepts/sharing";
import { Router } from "./framework/router";

/**
 * This class does useful conversions for the frontend.
 * For example, it converts a {@link PostDoc} into a more readable format for the frontend.
 */
export default class Responses {
  /**
   * Convert PostDoc into more readable format for the frontend by converting the author id into a username.
   */
  static async post(post: PostDoc | null) {
    if (!post) {
      return post;
    }
    const author = await User.getUserById(post.author);
    return { ...post, author: author.username };
  }

  /**
   * Convert SharingDoc into more readable format for the frontend by converting the user ids into a username.
   */
  static async sharedResource(sharedResource: SharingDoc | null) {
    if (!sharedResource) {
      return sharedResource;
    }
    const owner = await User.getUserById(sharedResource.owner);
    const requested = await User.idsToUsernames(sharedResource.requestedAccess);
    const withAccess = await User.idsToUsernames(sharedResource.withAccess);
    return { ...sharedResource, owner: owner.username, requestedAccess: requested, withAccess: withAccess };
  }

  /**
   * Same as {@link sharedResource} but for an array of SharingDoc for improved performance.
   */
  static async sharedResources(sharedResources: SharingDoc[]) {
    const owners = await User.idsToUsernames(sharedResources.map((resource) => resource.owner));
    const requested = await Promise.all(sharedResources.map(async (resource) => await User.idsToUsernames(resource.requestedAccess)));
    const withAccess = await Promise.all(sharedResources.map(async (resource) => await User.idsToUsernames(resource.withAccess)));
    return sharedResources.map((resource, i) => ({ ...resource, owner: owners[i], requestedAccess: requested[i], withAccess: withAccess[i] }));
  }

  /**
   * Convert GroupDoc into more readable format for the frontend by converting the creator and members id into a username.
   */
  static async group(group: GroupDoc | null) {
    if (!group) {
      return group;
    }
    const creator = await User.getUserById(group.creator);
    const members = await User.idsToUsernames(group.members);
    return { ...group, creator: creator.username, members: members };
  }

  /**
   * Same as {@link group} but for an array of GroupDoc for improved performance.
   */
  static async groups(groups: GroupDoc[]) {
    const creators = await User.idsToUsernames(groups.map((group) => group.creator));
    const members = await Promise.all(groups.map(async (group) => await User.idsToUsernames(group.members)));
    return groups.map((group, i) => ({ ...group, creator: creators[i], members: members[i] }));
  }

  /**
   * Same as {@link post} but for an array of PostDoc for improved performance.
   */
  static async posts(posts: PostDoc[]) {
    const authors = await User.idsToUsernames(posts.map((post) => post.author));
    return posts.map((post, i) => ({ ...post, author: authors[i] }));
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
