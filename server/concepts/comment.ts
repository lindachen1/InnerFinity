import { ObjectId } from "mongodb";
import DocCollection, { BaseDoc } from "../framework/doc";
import { NotAllowedError, NotFoundError } from "./errors";

export interface CommentDoc extends BaseDoc {
  author: ObjectId;
  content: string;
  target: ObjectId;
}

export default class CommentConcept {
  public readonly comments = new DocCollection<CommentDoc>("comments");

  async create(author: ObjectId, content: string, target: ObjectId) {
    target = new ObjectId(target);
    const _id = await this.comments.createOne({ author, content, target });
    return { msg: "Comment successfully created!", comment: await this.comments.readOne({ _id }) };
  }

  async getCommentsByTarget(targetId: ObjectId, possibleIds?: Array<ObjectId>) {
    targetId = new ObjectId(targetId);
    if (possibleIds) {
      return await this.comments.readMany({ _id: { $in: possibleIds }, target: targetId }, { sort: { dateUpdated: -1 } });
    }
    return await this.comments.readMany({ target: targetId }, { sort: { dateUpdated: -1 } });
  }

  async delete(_id: ObjectId) {
    await this.comments.deleteOne({ _id });
    return { msg: "Comment successfully deleted!" };
  }

  async deleteByTarget(targetId: ObjectId) {
    targetId = new ObjectId(targetId);
    await this.comments.deleteMany({ target: targetId });
    return { msg: `Comments under target ${targetId} successfully deleted!` };
  }

  async deleteByAuthor(user: ObjectId) {
    await this.comments.deleteMany({ author: user });
    return { msg: `Comments by author ${user} successfully deleted!` };
  }

  async isAuthor(_id: ObjectId, user: ObjectId) {
    const comment = await this.comments.readOne({ _id });
    if (!comment) {
      throw new NotFoundError(`Comment ${_id} does not exist!`);
    }
    if (comment.author.toString() !== user.toString()) {
      throw new NotAllowedError(`${user} is not the author of comment ${_id}!`);
    }
  }
}
