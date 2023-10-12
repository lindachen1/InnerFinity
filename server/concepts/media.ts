import { ObjectId } from "mongodb";
import DocCollection, { BaseDoc } from "../framework/doc";

export interface MediaDoc extends BaseDoc {
  image: string;
  caption: string;
  altText: string;
}

export default class MediaConcept {
  public readonly medias;

  public constructor(name: string) {
    this.medias = new DocCollection<MediaDoc>(name);
  }
  async create(image: string, caption: string, altText: string) {
    return await this.medias.createOne({ image, caption, altText });
  }

  async delete(_id: ObjectId) {
    return await this.medias.deleteOne({ _id });
  }

  async getMedia(_id: ObjectId) {
    return await this.medias.readOne({ _id });
  }
}
