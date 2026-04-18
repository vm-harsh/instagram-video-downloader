import { ZodError } from 'zod';

export function notFound(req, res) {
  res.status(404).json({ message: 'Route not found.' });
}

export function errorHandler(error, req, res, _next) {
  req.log?.error({ err: error }, error.message);

  if (res.headersSent) return;

  if (error instanceof ZodError) {
    res.status(400).json({
      message: 'Invalid request.',
      issues: error.issues
    });
    return;
  }

  if (error.message?.includes('Only instagram.com')) {
    res.status(400).json({ message: error.message });
    return;
  }

  res.status(422).json({
    message: error.message || 'Request failed.'
  });
}
