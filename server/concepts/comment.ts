import { ObjectId } from "mongodb";
import DocCollection, { BaseDoc } from "../framework/doc";

export interface CommentDoc extends BaseDoc {
  author: ObjectId;
  content: string;
  target: ObjectId;
}

export default class CommentConcept {
  public readonly comments = new DocCollection<CommentDoc>("comments");

  async create(author: ObjectId, content: string, target: ObjectId) {
    const _id = await this.comments.createOne({ author, content, target });
    return { msg: "Comment successfully created!", comment: await this.comments.readOne({ _id }) };
  }

  async getCommentsByTarget(targetId: ObjectId) {
    const comments = await this.comments.readMany({ target: targetId }, { sort: { dateUpdated: -1 } });
    return comments;
  }
}
