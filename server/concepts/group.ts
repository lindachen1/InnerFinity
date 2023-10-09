import { Filter, ObjectId } from "mongodb";
import DocCollection, { BaseDoc } from "../framework/doc";
import { includes } from "../framework/utils";
import { NotAllowedError, NotFoundError } from "./errors";

export interface GroupDoc extends BaseDoc {
  name: string;
  creator: ObjectId;
  members: Array<ObjectId>;
}

export default class GroupConcept {
  public readonly groups = new DocCollection<GroupDoc>("groups");

  async createGroup(name: string, creator: ObjectId, members: Array<ObjectId>) {
    if (!includes(members, creator)) {
      members.push(creator);
    }
    const _id = await this.groups.createOne({ name, creator, members });
    return { msg: "Group successfully created!", group: await this.groups.readOne({ _id }) };
  }

  async editName(_id: ObjectId, name: string) {
    await this.groups.updateOne({ _id }, { name: name });
    return { msg: "Group name edited!" };
  }

  async addToGroup(_id: ObjectId, user: ObjectId) {
    const group = await this.groups.readOne({ _id });
    if (group === null) {
      throw new GroupNotFoundError(_id);
    }
    await this.groups.updateOneGeneral({ _id }, { $addToSet: { members: user } });
    return { msg: "Group member added!" };
  }

  async removeFromGroup(_id: ObjectId, user: ObjectId) {
    const group = await this.groups.readOne({ _id });
    if (group === null) {
      throw new GroupNotFoundError(_id);
    }
    await this.groups.updateOneGeneral({ _id }, { $pull: { members: user } });
    return { msg: "Group member removed!" };
  }

  async getGroups(query: Filter<GroupDoc>) {
    const groups = await this.groups.readMany(query);
    return groups;
  }

  async getMembers(_id: ObjectId) {
    const group = await this.groups.readOne({ _id });
    if (group === null) {
      throw new GroupNotFoundError(_id);
    }
    return group.members;
  }

  async isMember(user: ObjectId, _id: ObjectId) {
    const group = await this.groups.readOne({ _id });
    if (!group) {
      throw new GroupNotFoundError(_id);
    }
    if (!group.members.map((member) => member.toString()).includes(user.toString())) {
      throw new GroupNotMemberError(user, _id);
    }
  }

  async isCreator(user: ObjectId, _id: ObjectId) {
    const group = await this.groups.readOne({ _id });
    if (!group) {
      throw new GroupNotFoundError(_id);
    }
    if (group.creator.toString() !== user.toString()) {
      throw new GroupCreatorNotMatchError(user, _id);
    }
  }
}

export class GroupNotFoundError extends NotFoundError {
  constructor(public readonly group: ObjectId) {
    super("Group {0} does not exist!", group);
  }
}

export class GroupNotMemberError extends NotAllowedError {
  constructor(
    public readonly user: ObjectId,
    public readonly _id: ObjectId,
  ) {
    super("{0} is not a member of group {1}!", user, _id);
  }
}

export class GroupCreatorNotMatchError extends NotAllowedError {
  constructor(
    public readonly creator: ObjectId,
    public readonly _id: ObjectId,
  ) {
    super("{0} is not the creator of group {1}!", creator, _id);
  }
}
