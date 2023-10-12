import { Filter, ObjectId } from "mongodb";
import DocCollection, { BaseDoc } from "../framework/doc";
import { includes } from "../framework/utils";
import { NotAllowedError, NotFoundError } from "./errors";

export interface SharingDoc extends BaseDoc {
  owners: Array<ObjectId>;
  resource: ObjectId;
  allowRequests: boolean;
  requestedAccess: Array<ObjectId>;
  usersWithAccess: Array<ObjectId>;
  listsWithAccess: Array<ObjectId>;
}

export default class SharingConcept {
  public readonly sharedResources;

  public constructor(name: string) {
    this.sharedResources = new DocCollection<SharingDoc>(name);
  }

  async limitSharing(owners: Array<ObjectId>, resource: ObjectId, allowRequests: boolean, usersWithAccess: Array<ObjectId>, listsWithAccess: Array<ObjectId>) {
    const requestedAccess: Array<ObjectId> = [];
    for (const owner of owners) {
      if (!includes(usersWithAccess, owner)) {
        usersWithAccess.push(owner);
      }
    }
    await this.sharedResources.createOne({ owners, resource, allowRequests, requestedAccess, usersWithAccess, listsWithAccess });
    return { msg: "Shared resource successfully created" };
  }

  async updateResource(oldId: ObjectId, newId: ObjectId) {
    oldId = new ObjectId(oldId);
    newId = new ObjectId(newId);
    const result = await this.sharedResources.updateOne({ resource: oldId }, { resource: newId });
    return result;
  }

  async deleteByResourceId(resourceId: ObjectId) {
    resourceId = new ObjectId(resourceId);
    await this.sharedResources.deleteOne({ resource: resourceId });
    return { msg: "Shared resource deleted successfully!" };
  }

  async deleteMany(filter: Filter<SharingDoc>) {
    return await this.sharedResources.deleteMany(filter);
  }

  async requestAccess(_id: ObjectId, user: ObjectId) {
    _id = new ObjectId(_id);
    const sharedResource = await this.sharedResources.readOne({ resource: _id });
    if (sharedResource === null) {
      throw new SharedResourceNotFoundError(_id);
    }
    if (sharedResource.allowRequests === false) {
      throw new RequestAccessNotAllowedError(_id);
    }
    if (includes(sharedResource.usersWithAccess, user)) {
      throw new AccessAlreadyGrantedError(_id, user);
    }
    if (includes(sharedResource.requestedAccess, user)) {
      throw new RequestAlreadyExistsError(_id, user);
    }
    await this.sharedResources.updateOneGeneral({ resource: _id }, { $addToSet: { requestedAccess: user } });
    return { msg: "Successfully requested access!" };
  }

  async addUserAccess(_id: ObjectId, user: ObjectId) {
    _id = new ObjectId(_id);
    const sharedResource = await this.sharedResources.readOne({ resource: _id });
    if (sharedResource === null) {
      throw new SharedResourceNotFoundError(_id);
    }
    if (includes(sharedResource.usersWithAccess, user)) {
      throw new AccessAlreadyGrantedError(_id, user);
    }
    if (includes(sharedResource.requestedAccess, user)) {
      await this.sharedResources.updateOneGeneral({ resource: _id }, { $pull: { requestedAccess: user } });
    }
    await this.sharedResources.updateOneGeneral({ resource: _id }, { $addToSet: { usersWithAccess: user } });
    return { msg: "Successfully added access!" };
  }

  async addListAccess(_id: ObjectId, list: ObjectId) {
    _id = new ObjectId(_id);
    const sharedResource = await this.sharedResources.readOne({ resource: _id });
    if (sharedResource === null) {
      throw new SharedResourceNotFoundError(_id);
    }
    if (includes(sharedResource.listsWithAccess, list)) {
      throw new AccessAlreadyGrantedError(_id, list);
    }
    await this.sharedResources.updateOneGeneral({ resource: _id }, { $addToSet: { listsWithAccess: list } });
    return { msg: "Successfully added access!" };
  }

  async removeUserAccess(_id: ObjectId, user: ObjectId) {
    _id = new ObjectId(_id);
    await this.isNotOwner(user, _id);
    const sharedResource = await this.sharedResources.readOne({ resource: _id });
    if (sharedResource === null) {
      throw new SharedResourceNotFoundError(_id);
    }
    if (!includes(sharedResource.usersWithAccess, user)) {
      throw new AccessDoesNotExistError(_id, user);
    }
    await this.sharedResources.updateOneGeneral({ resource: _id }, { $pull: { usersWithAccess: user } });
    return { msg: "Successfully removed access!" };
  }

  async removeListAccess(_id: ObjectId, list: ObjectId) {
    _id = new ObjectId(_id);
    const sharedResource = await this.sharedResources.readOne({ resource: _id });
    if (sharedResource === null) {
      throw new SharedResourceNotFoundError(_id);
    }
    if (!includes(sharedResource.listsWithAccess, list)) {
      throw new AccessDoesNotExistError(_id, list);
    }
    await this.sharedResources.updateOneGeneral({ resource: _id }, { $pull: { listsWithAccess: list } });
    return { msg: "Successfully removed access!" };
  }

  async deleteResourcesByOwner(user: ObjectId) {
    await this.sharedResources.deleteMany({ owners: [user] });
    await this.sharedResources.updateMany({ owners: user }, { $pull: { owners: user } });
    return { msg: "Removed user's shared resources" };
  }

  async getResources(filter: Filter<SharingDoc>) {
    return await this.sharedResources.readMany(filter);
  }

  async getResourcesByAccessible(user: ObjectId, lists: Array<ObjectId>) {
    return await this.sharedResources.readMany({ $or: [{ usersWithAccess: user }, { listsWithAccess: { $in: lists } }] });
  }

  async getResourcesByOwner(user: ObjectId) {
    return await this.sharedResources.readMany({ owner: user });
  }

  async isAccessible(resource: ObjectId, user: ObjectId, lists: Array<ObjectId>) {
    const resourceId = new ObjectId(resource);
    const result = await this.sharedResources.readOne({ resource: resourceId, $or: [{ usersWithAccess: user }, { listsWithAccess: { $in: lists } }] });
    if (result === null) {
      throw new NotAllowedError(`Can not access Sharing object with resource ID ${resource}`);
    }
  }

  async isOwner(user: ObjectId, _id: ObjectId) {
    _id = new ObjectId(_id);
    const sharedResource = await this.sharedResources.readOne({ resource: _id });
    if (!sharedResource) {
      throw new SharedResourceNotFoundError(_id);
    }
    if (!includes(sharedResource.owners, user)) {
      throw new ResourceOwnerNotMatchError(user, _id);
    }
  }

  private async isNotOwner(user: ObjectId, _id: ObjectId) {
    _id = new ObjectId(_id);
    const sharedResource = await this.sharedResources.readOne({ resource: _id });
    if (!sharedResource) {
      throw new SharedResourceNotFoundError(_id);
    }
    if (includes(sharedResource.owners, user)) {
      throw new NotAllowedError(`${user} is an owner of of resource ${_id}`);
    }
  }
}

export class SharedResourceNotFoundError extends NotFoundError {
  constructor(public readonly resource: ObjectId) {
    super("Sharing object with resource ID {0} does not exist!", resource);
  }
}

export class RequestAccessNotAllowedError extends NotAllowedError {
  constructor(public readonly resource: ObjectId) {
    super("Can not request access to resource {0}!", resource);
  }
}

export class AccessAlreadyGrantedError extends NotAllowedError {
  constructor(
    public readonly _id: ObjectId,
    public readonly user: ObjectId,
  ) {
    super("User or UserList {0} already has access to resource {1}!", user, _id);
  }
}

export class RequestAlreadyExistsError extends NotAllowedError {
  constructor(
    public readonly _id: ObjectId,
    public readonly user: ObjectId,
  ) {
    super("User {0} already requested access to resource {1}!", user, _id);
  }
}

export class AccessDoesNotExistError extends NotAllowedError {
  constructor(
    public readonly _id: ObjectId,
    public readonly user: ObjectId,
  ) {
    super("User or UserList {0} does not have access to resource {1}!", user, _id);
  }
}

export class ResourceOwnerNotMatchError extends NotAllowedError {
  constructor(
    public readonly owner: ObjectId,
    public readonly _id: ObjectId,
  ) {
    super("{0} is not an owner of resource {1}!", owner, _id);
  }
}
