import { AdminResource } from "../../models/admin/admin-resources.model.js";
import AdminResourceService from "../../service/admin/admin-resource.service.js";
import ErrorResponse from "../../utils/ErrorHandler.js";
import ApiFeatures from "../../utils/apiFeatures.js";
import logger from "../../logger/logger.js";
import { createResourceId } from "../../utils/helper.js";
import {
  adminLabelEnum,
  adminMessagesEnum,
  labelEnum,
  statusEnum,
} from "../../enums/index.js";
import dotenv from "dotenv";
import { adminActivityTracking } from "../../lib/admin/index.js";

dotenv.config({ quiet: true });

const findResourceOrThrow = async (resourceId, label) => {
  const resource =
    await AdminResourceService.getResourceByResourceId(resourceId);

  if (!resource) {
    logger.warn(
      `${labelEnum.CURRENT_TIME_STAMP}-${label}-${adminMessagesEnum.RESOURCE_NOT_FOUND}`
    );
    throw new ErrorResponse(
      adminMessagesEnum.RESOURCE_NOT_FOUND,
      statusEnum.statusCode.HTTP_NOT_FOUND
    );
  }

  return resource;
};

export const AdminResourceController = {
  createResource: async (req, res, next) => {
    try {
      const { name } = req.body;

      const existing =
        await AdminResourceService.getResourceByNameIncludingDeleted(name);

      if (existing) {
        logger.warn(
          `${labelEnum.CURRENT_TIME_STAMP}-${adminLabelEnum.CREATE_RESOURCE}-${adminMessagesEnum.RESOURCE_EXISTS}`
        );
        throw new ErrorResponse(
          adminMessagesEnum.RESOURCE_EXISTS,
          statusEnum.statusCode.HTTP_CONFLICT
        );
      }

      let allResourceLength;
      const allResource =
        await AdminResourceService.getAllResourcesIncludingDeleted();

      if (allResource) {
        allResourceLength = allResource.length;
      } else {
        logger.warn(
          `${labelEnum.CURRENT_TIME_STAMP}-${adminLabelEnum.CREATE_RESOURCE}-${adminMessagesEnum.RESOURCE_NOT_FOUND}`
        );

        throw new ErrorResponse(
          adminMessagesEnum.RESOURCE_NOT_FOUND,
          statusEnum.statusCode.HTTP_NOT_FOUND
        );
      }

      const resource = await AdminResource.create({
        resourceId: createResourceId(allResourceLength + 1),
        name,
      });

      logger.info(
        `${labelEnum.CURRENT_TIME_STAMP}-${adminLabelEnum.CREATE_RESOURCE}-${adminMessagesEnum.RESOURCE_CREATED_SUCCESSFULLY}`
      );

      return res.status(statusEnum.statusCode.HTTP_CREATED).json({
        code: statusEnum.statusCode.HTTP_CREATED,
        success: true,
        message: adminMessagesEnum.RESOURCE_CREATED_SUCCESSFULLY,
        resource,
      });
    } catch (error) {
      logger.error(
        `Create resource failed::${labelEnum.CURRENT_TIME_STAMP}-${adminLabelEnum.CREATE_RESOURCE}`,
        error.message
      );
      next(error);
    }
  },

  getAllResources: async (req, res, next) => {
    try {
      const queryParams = { ...req.query };
      if (!queryParams.sort) {
        queryParams.sort = "name";
      }

      const resultPerPage = Math.min(Number(queryParams.limit) || 20, 100);
      const currentPage = Number(queryParams.page) || 1;

      const features = new ApiFeatures(
        AdminResourceService.getAllResources(),
        queryParams,
        {
          searchableFields: ["name", "description"],
          filterAllowlist: ["name"],
        }
      );

      features.search().filter().sort();

      const filter = features.query.getFilter();
      const resourcesCount = await AdminResourceService.countDocuments(filter);

      features.pagination(resultPerPage);
      const resources = await features.query;

      logger.info(
        `${labelEnum.CURRENT_TIME_STAMP}-${adminLabelEnum.GET_ALL_RESOURCES}-${adminMessagesEnum.RESOURCES_FETCHED_SUCCESSFULLY}`
      );

      return res.status(statusEnum.statusCode.HTTP_OK).json({
        code: statusEnum.statusCode.HTTP_OK,
        success: true,
        message: adminMessagesEnum.RESOURCES_FETCHED_SUCCESSFULLY,
        resources,
        pagination: {
          count: resources.length,
          totalResources: resourcesCount,
          resultPerPage,
          totalPages: Math.max(1, Math.ceil(resourcesCount / resultPerPage)),
          currentPage,
        },
      });
    } catch (error) {
      logger.error(
        `Get all resources failed::${labelEnum.CURRENT_TIME_STAMP}-${adminLabelEnum.GET_ALL_RESOURCES}`,
        error.message
      );
      next(error);
    }
  },

  getOneResource: async (req, res, next) => {
    try {
      const { resourceId } = req.params;

      const resource =
        await AdminResourceService.getResourceWithPermissions(resourceId);

      if (!resource) {
        logger.warn(
          `${labelEnum.CURRENT_TIME_STAMP}-${adminLabelEnum.GET_ONE_RESOURCE}-${adminMessagesEnum.RESOURCE_NOT_FOUND}`
        );
        throw new ErrorResponse(
          adminMessagesEnum.RESOURCE_NOT_FOUND,
          statusEnum.statusCode.HTTP_NOT_FOUND
        );
      }

      logger.info(
        `${labelEnum.CURRENT_TIME_STAMP}-${adminLabelEnum.GET_ONE_RESOURCE}-${adminMessagesEnum.RESOURCE_FETCHED_SUCCESSFULLY}`
      );

      return res.status(statusEnum.statusCode.HTTP_OK).json({
        code: statusEnum.statusCode.HTTP_OK,
        success: true,
        message: adminMessagesEnum.RESOURCE_FETCHED_SUCCESSFULLY,
        resource,
      });
    } catch (error) {
      logger.error(
        `Get one resource failed::${labelEnum.CURRENT_TIME_STAMP}-${adminLabelEnum.GET_ONE_RESOURCE}`,
        error.message
      );
      next(error);
    }
  },

  editResource: async (req, res, next) => {
    try {
      const { resourceId } = req.params;
      const { name, description } = req.body;

      const resource = await findResourceOrThrow(
        resourceId,
        adminLabelEnum.EDIT_RESOURCE
      );

      if (name !== undefined) {
        const nameOwner =
          await AdminResourceService.getResourceByNameIncludingDeleted(name);

        if (nameOwner && nameOwner.resourceId !== resource.resourceId) {
          logger.warn(
            `${labelEnum.CURRENT_TIME_STAMP}-${adminLabelEnum.EDIT_RESOURCE}-${adminMessagesEnum.RESOURCE_EXISTS}`
          );
          throw new ErrorResponse(
            adminMessagesEnum.RESOURCE_EXISTS,
            statusEnum.statusCode.HTTP_CONFLICT
          );
        }

        resource.name = name;
      }

      if (description !== undefined) {
        resource.description = description;
      }

      await resource.save();

      logger.info(
        `${labelEnum.CURRENT_TIME_STAMP}-${adminLabelEnum.EDIT_RESOURCE}-${adminMessagesEnum.RESOURCE_UPDATED_SUCCESSFULLY}`
      );

      return res.status(statusEnum.statusCode.HTTP_OK).json({
        code: statusEnum.statusCode.HTTP_OK,
        success: true,
        message: adminMessagesEnum.RESOURCE_UPDATED_SUCCESSFULLY,
        resource,
      });
    } catch (error) {
      logger.error(
        `Edit resource failed::${labelEnum.CURRENT_TIME_STAMP}-${adminLabelEnum.EDIT_RESOURCE}`,
        error.message
      );
      next(error);
    }
  },

  deleteResource: async (req, res, next) => {
    try {
      const { resourceId } = req.params;

      const resource = await findResourceOrThrow(
        resourceId,
        adminLabelEnum.DELETE_RESOURCE
      );

      await resource.softDelete();

      logger.info(
        `${labelEnum.CURRENT_TIME_STAMP}-${adminLabelEnum.DELETE_RESOURCE}-${adminMessagesEnum.RESOURCE_DELETED_SUCCESSFULLY}`
      );

      return res.status(statusEnum.statusCode.HTTP_OK).json({
        code: statusEnum.statusCode.HTTP_OK,
        success: true,
        message: adminMessagesEnum.RESOURCE_DELETED_SUCCESSFULLY,
      });
    } catch (error) {
      logger.error(
        `Delete resource failed::${labelEnum.CURRENT_TIME_STAMP}-${adminLabelEnum.DELETE_RESOURCE}`,
        error.message
      );
      next(error);
    }
  },
};
