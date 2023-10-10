import { Filter, ObjectId } from "mongodb";

import DocCollection, { BaseDoc } from "../framework/doc";
import { includes } from "../framework/utils";
import { NotAllowedError, NotFoundError } from "./errors";

export interface PostDoc extends BaseDoc {
  authors: Array<ObjectId>;
  content: string;
}

export interface PendingPostDoc extends BaseDoc {
  authors: Array<ObjectId>;
  content: string;
  requiresApproval: Array<ObjectId>;
}

export default class PostConcept {
  public readonly pendingPosts = new DocCollection<PendingPostDoc>("pendingPosts");
  public readonly publishedPosts = new DocCollection<PostDoc>("publishedPosts");

  async create(authors: Array<ObjectId>, content: string) {
    const requiresApproval = authors.length === 1 ? [] : authors;
    const _id = await this.pendingPosts.createOne({ authors, content, requiresApproval });
    return await this.publish(_id);
  }

  private async publish(postId: ObjectId) {
    const pendingPost = await this.pendingPosts.readOne({ _id: postId });
    if (!pendingPost) {
      throw new PostNotFoundError(postId);
    }
    if (pendingPost.requiresApproval.length === 0) {
      await this.pendingPosts.deleteOne({ _id: postId });
      const authors = pendingPost.authors;
      const content = pendingPost.content;
      const _id = await this.publishedPosts.createOne({ authors, content });
      return { msg: "Post successfully published!", post: await this.publishedPosts.readOne({ _id }) };
    } else {
      return { msg: "Post is pending approval!", post: pendingPost };
    }
  }

  async approvePost(_id: ObjectId, user: ObjectId) {
    const update = await this.pendingPosts.updateOneGeneral({ _id }, { $pull: { requiresApproval: user } });
    if (update.modifiedCount === 0) {
      throw new ApprovalNotRequiredError(_id, user);
    }
    return await this.publish(_id);
  }

  async rejectPost(_id: ObjectId, user: ObjectId) {
    const pendingPost = await this.pendingPosts.readOne({ _id });
    if (!pendingPost) {
      throw new PostNotFoundError(_id);
    }
    if (!includes(pendingPost.requiresApproval, user)) {
      throw new ApprovalNotRequiredError(_id, user);
    }
    await this.pendingPosts.deleteOne({ _id });
    return { msg: "Pending post rejected, will be deleted. " };
  }

  async getPendingPosts(query: Filter<PendingPostDoc>) {
    const posts = await this.pendingPosts.readMany(query, {
      sort: { dateUpdated: -1 },
    });
    return posts;
  }

  async getPosts(query: Filter<PostDoc>) {
    const posts = await this.publishedPosts.readMany(query, {
      sort: { dateUpdated: -1 },
    });
    return posts;
  }

  async getByAuthor(author: ObjectId) {
    return await this.getPosts({ author: author });
  }

  async delete(_id: ObjectId) {
    await this.publishedPosts.deleteOne({ _id });
    return { msg: "Post deleted successfully!" };
  }

  async deleteMany(filter: Filter<PostDoc>) {
    await this.publishedPosts.deleteMany(filter);
    await this.pendingPosts.deleteMany(filter);
    return { msg: "Posts deleted successfully!" };
  }

  async removeAuthor(user: ObjectId) {
    await this.publishedPosts.deleteMany({ authors: [user] });
    await this.pendingPosts.deleteMany({ authors: [user] });
    await this.publishedPosts.updateMany({ authors: user }, { $pull: { authors: user } });
    await this.pendingPosts.updateMany({ authors: user }, { $pull: { authors: user } });
    await this.pendingPosts.updateMany({ requiresApproval: user }, { $pull: { requiresApproval: user } });
    return { msg: "Removed user's posts" };
  }

  async isAuthor(user: ObjectId, _id: ObjectId) {
    const post = (await this.publishedPosts.readOne({ _id })) ?? (await this.pendingPosts.readOne({ _id }));
    if (!post) {
      throw new NotFoundError(`Post ${_id} does not exist!`);
    }
    if (post.authors.map((author) => author.toString()).includes(user.toString())) {
      throw new PostAuthorNotMatchError(user, _id);
    }
  }

  // private sanitizeUpdate(update: Partial<PostDoc>) {
  //   // Make sure the update cannot change the author.
  //   const allowedUpdates = ["content", "options"];
  //   for (const key in update) {
  //     if (!allowedUpdates.includes(key)) {
  //       throw new NotAllowedError(`Cannot update '${key}' field!`);
  //     }
  //   }
  // }
}

export class PostAuthorNotMatchError extends NotAllowedError {
  constructor(
    public readonly author: ObjectId,
    public readonly _id: ObjectId,
  ) {
    super("{0} is not an author of post {1}!", author, _id);
  }
}

export class ApprovalNotRequiredError extends NotAllowedError {
  constructor(
    public readonly _id: ObjectId,
    public readonly user: ObjectId,
  ) {
    super("{0} is not an approver of post {1}!", user, _id);
  }
}

export class PostNotFoundError extends NotFoundError {
  constructor(public readonly _id: ObjectId) {
    super("Post {0} does not exist!", _id);
  }
}
