import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PropertyComparisonDto, PropertyDescDto, PropertyDto } from './dto/propertyDto';
import { PrismaService } from 'lib/common/database/prisma.service';
import { reverseGeocode } from 'lib/reverseGeocode';
import {
  generateAnswers,
  generateComparison,
  generateDescription,
} from 'lib/genAI/gen';

interface Context {
  role: string;
  content: string;
}

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) { }

  getHello(): string {
    return 'Hello World!';
  }

  async addProperty(data: PropertyDto) {
    try {
      const props = await this.prisma.property.findMany();
      let id;
      if (!props) {
        id = 1;
      }
      else {
        id = props.length + 1;
      }
      await this.prisma.property.create({
        data: {
          id: id,
          owner: data.owner,
          name: data.name,
          location: data.location,
          price: data.price,
          bedrooms: data.bedrooms,
          sqft: data.sqft,
          imageUrl: data.imageUrl,
          ammenities: data.ammenities,
        },
      });
      return { message: 'Property added successfully', status: 200 };
    } catch (error) {
      console.log('Error creating user:', error);
      throw new HttpException(
        'Failed to Subscribing user, try again or come back later.',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async getAnswer(data: { query: string; context?: Context[] }) {
    const { query, context } = data;
    let cont;
    if (!context) {
      cont = [];
    }
    return {
      answer: await generateAnswers(query, cont),
    };
  }

  async getDescription(data: PropertyDescDto) {
    return await generateDescription(data);
  }

  async getComparison(data: PropertyComparisonDto[]) {
    return await generateComparison(data);
  }

  async getAllProperties() {
    let props = await this.prisma.property.findMany();
    const propsWithAddresses = await Promise.all(
      props.map(async (prop) => {
        const [lat, lon] = prop.location.split(",").map(Number);
        const address = await reverseGeocode(lat, lon);
        return {
          ...prop,
          address
        };
      })
    );
    return propsWithAddresses;
  }

  async getPropertyById(id: number) {
    return await this.prisma.property.findFirst({
      where: {
        id: id,
      },
    });
  }

  async updateProperty(id: number, data: PropertyDto) {
    return await this.prisma.property.update({
      where: {
        id: id,
      },
      data: {
        name: data.name,
        location: data.location,
        bedrooms: data.bedrooms,
        sqft: data.sqft,
        imageUrl: data.imageUrl,
      },
    });
  }

  async deleteProperty(id: number) {
    return await this.prisma.property.delete({
      where: {
        id: id,
      },
    });
  }

  async getPropertyByOwner(owner: string) {
    return await this.prisma.property.findMany({
      where: {
        owner: owner,
      },
    });
  }

  async getPropertiesByIds(ids: number[]) {
    return await this.prisma.property.findMany({
      where: {
        id: {
          in: ids,
        },
      },
    });
  }
}
