import fs from 'fs';
import path from 'path';
import { logger } from '../config/logger';
import { IEmailTemplate } from '../types';

export class EmailHelper {
  private templateCache: Map<string, string> = new Map();
  private templatesDir: string;

  constructor() {
    this.templatesDir = path.join(__dirname, 'templates');
  }

  async loadTemplate(templateName: string): Promise<string> {
    try {
      // Check cache first
      if (this.templateCache.has(templateName)) {
        return this.templateCache.get(templateName)!;
      }

      const templatePath = path.join(this.templatesDir, `${templateName}.html`);
      
      if (!fs.existsSync(templatePath)) {
        throw new Error(`Email template "${templateName}" not found at ${templatePath}`);
      }

      const templateContent = fs.readFileSync(templatePath, 'utf-8');
      
      // Cache the template
      this.templateCache.set(templateName, templateContent);
      
      logger.info(`Email template loaded: ${templateName}`);
      return templateContent;
    } catch (error) {
      logger.error(`Failed to load email template "${templateName}":`, error);
      throw error;
    }
  }

  async renderTemplate(templateName: string, variables: Record<string, any>): Promise<string> {
    try {
      const templateContent = await this.loadTemplate(templateName);
      return this.replaceVariables(templateContent, variables);
    } catch (error) {
      logger.error(`Failed to render email template "${templateName}":`, error);
      throw error;
    }
  }

  replaceVariables(template: string, variables: Record<string, any>): string {
    let result = template;

    // Replace simple variables {{variableName}}
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, String(value || ''));
    }

    // Handle conditional blocks {{#if variable}}...{{/if}}
    result = this.processConditionals(result, variables);

    // Handle loops {{#each array}}...{{/each}}
    result = this.processLoops(result, variables);

    return result;
  }

  private processConditionals(template: string, variables: Record<string, any>): string {
    const conditionalRegex = /{{#if\s+(\w+)}}(.*?){{\/if}}/gs;
    
    return template.replace(conditionalRegex, (match, variableName, content) => {
      const value = variables[variableName];
      return value ? content : '';
    });
  }

  private processLoops(template: string, variables: Record<string, any>): string {
    const loopRegex = /{{#each\s+(\w+)}}(.*?){{\/each}}/gs;
    
    return template.replace(loopRegex, (match, arrayName, content) => {
      const array = variables[arrayName];
      if (!Array.isArray(array)) return '';
      
      return array.map((item, index) => {
        let itemContent = content;
        
        // Replace {{this}} with the current item
        itemContent = itemContent.replace(/{{this}}/g, String(item));
        
        // Replace {{@index}} with the current index
        itemContent = itemContent.replace(/{{@index}}/g, String(index));
        
        // If item is an object, replace its properties
        if (typeof item === 'object' && item !== null) {
          for (const [key, value] of Object.entries(item)) {
            const regex = new RegExp(`{{${key}}}`, 'g');
            itemContent = itemContent.replace(regex, String(value || ''));
          }
        }
        
        return itemContent;
      }).join('');
    });
  }

  async createEmailTemplate(templateData: IEmailTemplate): Promise<void> {
    try {
      const templatePath = path.join(this.templatesDir, `${templateData.name}.html`);
      const templateContent = this.generateTemplateHTML(templateData);
      
      fs.writeFileSync(templatePath, templateContent, 'utf-8');
      
      // Clear cache for this template
      this.templateCache.delete(templateData.name);
      
      logger.info(`Email template created: ${templateData.name}`);
    } catch (error) {
      logger.error(`Failed to create email template "${templateData.name}":`, error);
      throw error;
    }
  }

  async updateEmailTemplate(templateName: string, templateData: Partial<IEmailTemplate>): Promise<void> {
    try {
      const templatePath = path.join(this.templatesDir, `${templateName}.html`);
      
      if (!fs.existsSync(templatePath)) {
        throw new Error(`Email template "${templateName}" not found`);
      }

      const existingContent = fs.readFileSync(templatePath, 'utf-8');
      const updatedContent = this.generateTemplateHTML({
        name: templateName,
        subject: templateData.subject || this.extractSubjectFromHTML(existingContent),
        html: templateData.html || existingContent,
        text: templateData.text,
        variables: templateData.variables,
      });

      fs.writeFileSync(templatePath, updatedContent, 'utf-8');
      
      // Clear cache for this template
      this.templateCache.delete(templateName);
      
      logger.info(`Email template updated: ${templateName}`);
    } catch (error) {
      logger.error(`Failed to update email template "${templateName}":`, error);
      throw error;
    }
  }

  async deleteEmailTemplate(templateName: string): Promise<void> {
    try {
      const templatePath = path.join(this.templatesDir, `${templateName}.html`);
      
      if (!fs.existsSync(templatePath)) {
        throw new Error(`Email template "${templateName}" not found`);
      }

      fs.unlinkSync(templatePath);
      
      // Clear cache for this template
      this.templateCache.delete(templateName);
      
      logger.info(`Email template deleted: ${templateName}`);
    } catch (error) {
      logger.error(`Failed to delete email template "${templateName}":`, error);
      throw error;
    }
  }

  listEmailTemplates(): string[] {
    try {
      const files = fs.readdirSync(this.templatesDir);
      return files
        .filter(file => file.endsWith('.html'))
        .map(file => path.basename(file, '.html'));
    } catch (error) {
      logger.error('Failed to list email templates:', error);
      return [];
    }
  }

  async getTemplateInfo(templateName: string): Promise<IEmailTemplate | null> {
    try {
      const templateContent = await this.loadTemplate(templateName);
      const subject = this.extractSubjectFromHTML(templateContent);
      const variables = this.extractVariablesFromHTML(templateContent);

      return {
        name: templateName,
        subject,
        html: templateContent,
        variables,
      };
    } catch (error) {
      logger.error(`Failed to get template info for "${templateName}":`, error);
      return null;
    }
  }

  validateTemplate(templateContent: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check for basic HTML structure
    if (!templateContent.includes('<html>') || !templateContent.includes('</html>')) {
      errors.push('Template should have proper HTML structure');
    }

    // Check for unclosed variables
    const openVariables = (templateContent.match(/{{/g) || []).length;
    const closeVariables = (templateContent.match(/}}/g) || []).length;
    if (openVariables !== closeVariables) {
      errors.push('Template has unclosed variable placeholders');
    }

    // Check for unclosed conditionals
    const openIfs = (templateContent.match(/{{#if/g) || []).length;
    const closeIfs = (templateContent.match(/{{\/if}}/g) || []).length;
    if (openIfs !== closeIfs) {
      errors.push('Template has unclosed conditional blocks');
    }

    // Check for unclosed loops
    const openEach = (templateContent.match(/{{#each/g) || []).length;
    const closeEach = (templateContent.match(/{{\/each}}/g) || []).length;
    if (openEach !== closeEach) {
      errors.push('Template has unclosed loop blocks');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  clearCache(): void {
    this.templateCache.clear();
    logger.info('Email template cache cleared');
  }

  private generateTemplateHTML(templateData: IEmailTemplate): string {
    // If HTML is provided, use it directly
    if (templateData.html) {
      return templateData.html;
    }

    // Generate basic HTML structure
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${templateData.subject}</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
        }
        .container {
            background-color: #ffffff;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 0 20px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #007bff;
        }
        .header h1 {
            color: #007bff;
            margin: 0;
            font-size: 28px;
        }
        .content {
            margin-bottom: 30px;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            font-size: 14px;
            color: #666;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${templateData.subject}</h1>
        </div>
        <div class="content">
            <p>{{message}}</p>
        </div>
        <div class="footer">
            <p>Best regards,<br>The Team</p>
        </div>
    </div>
</body>
</html>`;
  }

  private extractSubjectFromHTML(html: string): string {
    const titleMatch = html.match(/<title>(.*?)<\/title>/);
    return titleMatch ? titleMatch[1] : 'No Subject';
  }

  private extractVariablesFromHTML(html: string): string[] {
    const variableRegex = /{{(\w+)}}/g;
    const variables: string[] = [];
    let match;

    while ((match = variableRegex.exec(html)) !== null) {
      if (!variables.includes(match[1])) {
        variables.push(match[1]);
      }
    }

    return variables;
  }

  async previewTemplate(templateName: string, variables: Record<string, any>): Promise<string> {
    try {
      return await this.renderTemplate(templateName, variables);
    } catch (error) {
      logger.error(`Failed to preview template "${templateName}":`, error);
      throw error;
    }
  }

  async duplicateTemplate(sourceTemplateName: string, newTemplateName: string): Promise<void> {
    try {
      const sourceTemplateInfo = await this.getTemplateInfo(sourceTemplateName);
      if (!sourceTemplateInfo) {
        throw new Error(`Source template "${sourceTemplateName}" not found`);
      }

      const newTemplateData: IEmailTemplate = {
        ...sourceTemplateInfo,
        name: newTemplateName,
        subject: sourceTemplateInfo.subject.replace(sourceTemplateName, newTemplateName),
      };

      await this.createEmailTemplate(newTemplateData);
      logger.info(`Template duplicated: ${sourceTemplateName} -> ${newTemplateName}`);
    } catch (error) {
      logger.error(`Failed to duplicate template "${sourceTemplateName}":`, error);
      throw error;
    }
  }
}

export const emailHelper = new EmailHelper();
