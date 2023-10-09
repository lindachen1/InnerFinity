import { Filter, ObjectId } from "mongodb";

import DocCollection, { BaseDoc } from "../framework/doc";
import { includes } from "../framework/utils";
import { NotAllowedError, NotFoundError } from "./errors";

export interface PostOptions {
  backgroundColor?: string;
}

export interface PostDoc extends BaseDoc {
  author: ObjectId;
  content: string;
  options?: PostOptions;
}

export interface PendingPostDoc extends BaseDoc {
  author: ObjectId;
  content: string;
  options?: PostOptions;
  requiresApproval: Array<ObjectId>;
}

export default class PostConcept {
  public readonly pendingPosts;
  public readonly publishedPosts;

  public constructor(name: string) {
    this.pendingPosts = new DocCollection<PendingPostDoc>(name + "_pending");
    this.publishedPosts = new DocCollection<PostDoc>(name + "_published");
  }

  async create(author: ObjectId, content: string, requiresApproval: Array<ObjectId>, options?: PostOptions) {
    const _id = await this.pendingPosts.createOne({ author, content, options, requiresApproval });
    return await this.publish(_id);
  }

  private async publish(postId: ObjectId) {
    const pendingPost = await this.pendingPosts.readOne({ postId });
    if (!pendingPost) {
      throw new PostNotFoundError(postId);
    }
    if (pendingPost.requiresApproval.length === 0) {
      await this.pendingPosts.deleteOne({ postId });
      const author = pendingPost.author;
      const content = pendingPost.content;
      const options = pendingPost.options;
      const _id = await this.publishedPosts.createOne({ author, content, options });
      return { msg: "Post successfully published!", post: await this.publishedPosts.readOne({ _id }) };
    } else {
      return { msg: "Post successfully created, but is pending approval." };
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

  async getPendingPosts(query: Filter<PostDoc>) {
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
    return await this.getPosts({ author });
  }

  // async update(_id: ObjectId, update: Partial<PostDoc>) {
  //   this.sanitizeUpdate(update);
  //   await this.posts.updateOne({ _id }, update);
  //   return { msg: "Post successfully updated!" };
  // }

  async delete(_id: ObjectId) {
    await this.publishedPosts.deleteOne({ _id });
    return { msg: "Post deleted successfully!" };
  }

  async isAuthor(user: ObjectId, _id: ObjectId) {
    const post = (await this.publishedPosts.readOne({ _id })) ?? (await this.pendingPosts.readOne({ _id }));
    if (!post) {
      throw new NotFoundError(`Post ${_id} does not exist!`);
    }
    if (post.author.toString() !== user.toString()) {
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
    super("{0} is not the author of post {1}!", author, _id);
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
