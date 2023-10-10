import { Filter, ObjectId } from "mongodb";
import DocCollection, { BaseDoc } from "../framework/doc";
import { includes } from "../framework/utils";
import { NotAllowedError, NotFoundError } from "./errors";

export interface SharingDoc extends BaseDoc {
  owners: Array<ObjectId>;
  resource: ObjectId;
  allowRequests: boolean;
  requestedAccess: Array<ObjectId>;
  withAccess: Array<ObjectId>;
}

export default class SharingConcept {
  public readonly sharedResources;

  public constructor(name: string) {
    this.sharedResources = new DocCollection<SharingDoc>(name);
  }

  async limitSharing(owners: Array<ObjectId>, resource: ObjectId, allowRequests: boolean, withAccess: Array<ObjectId>) {
    const requestedAccess: Array<ObjectId> = [];
    for (const owner of owners) {
      if (!includes(withAccess, owner)) {
        withAccess.push(owner);
      }
    }
    await this.sharedResources.createOne({ owners, resource, allowRequests, requestedAccess, withAccess });
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

  async requestAccess(_id: ObjectId, user: ObjectId) {
    const sharedResource = await this.sharedResources.readOne({ _id });
    if (sharedResource === null) {
      throw new SharedResourceNotFoundError(_id);
    }
    if (sharedResource.allowRequests === false) {
      throw new RequestAccessNotAllowedError(_id);
    }
    if (includes(sharedResource.withAccess, user)) {
      throw new AccessAlreadyGrantedError(_id, user);
    }
    if (includes(sharedResource.requestedAccess, user)) {
      throw new RequestAlreadyExistsError(_id, user);
    }
    await this.sharedResources.updateOneGeneral({ _id }, { $addToSet: { requestedAccess: user } });
    return { msg: "Successfully requested access!" };
  }

  async addAccess(_id: ObjectId, user: ObjectId) {
    const sharedResource = await this.sharedResources.readOne({ _id });
    if (sharedResource === null) {
      throw new SharedResourceNotFoundError(_id);
    }
    if (includes(sharedResource.withAccess, user)) {
      throw new AccessAlreadyGrantedError(_id, user);
    }
    if (includes(sharedResource.requestedAccess, user)) {
      await this.sharedResources.updateOneGeneral({ _id }, { $pull: { requestedAccess: user } });
    }
    await this.sharedResources.updateOneGeneral({ _id }, { $addToSet: { withAccess: user } });
    return { msg: "Successfully added access!" };
  }

  async removeAccess(_id: ObjectId, user: ObjectId) {
    const sharedResource = await this.sharedResources.readOne({ _id });
    if (sharedResource === null) {
      throw new SharedResourceNotFoundError(_id);
    }
    if (!includes(sharedResource.withAccess, user)) {
      throw new AccessDoesNotExistError(_id, user);
    }
    await this.sharedResources.updateOneGeneral({ _id }, { $pull: { withAccess: user } });
    return { msg: "Successfully removed access!" };
  }

  async getResources(filter: Filter<SharingDoc>) {
    return await this.sharedResources.readMany(filter);
  }

  async getResourcesByAccessable(targets: Array<ObjectId>) {
    return await this.sharedResources.readMany({ withAccess: { $in: targets } });
  }

  async getResourcesByOwner(user: ObjectId) {
    return await this.sharedResources.readMany({ owner: user });
  }

  async isOwner(user: ObjectId, _id: ObjectId) {
    const sharedResource = await this.sharedResources.readOne({ _id });
    if (!sharedResource) {
      throw new SharedResourceNotFoundError(_id);
    }
    if (!includes(sharedResource.owners, user)) {
      throw new ResourceOwnerNotMatchError(user, _id);
    }
  }
}

export class SharedResourceNotFoundError extends NotFoundError {
  constructor(public readonly resource: ObjectId) {
    super("Shared resource {0} does not exist!", resource);
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
    super("User {0} already has access to resource {1}!", user, _id);
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
    super("User {0} does not have access to resource {1}!", user, _id);
  }
}

export class ResourceOwnerNotMatchError extends NotAllowedError {
  constructor(
    public readonly owner: ObjectId,
    public readonly _id: ObjectId,
  ) {
    super("{0} is not an owner of shared resource {1}!", owner, _id);
  }
}
