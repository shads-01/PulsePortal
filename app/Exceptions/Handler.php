<?php

namespace App\Exceptions;

use Illuminate\Foundation\Exceptions\Handler as ExceptionHandler;
use Throwable;

class Handler extends ExceptionHandler
{
    /**
     * The list of the inputs that are never flashed to the session on validation exceptions.
     *
     * @var array<int, string>
     */
    protected $dontFlash = [
        'current_password',
        'password',
        'password_confirmation',
    ];

    /**
     * Register the exception handling callbacks for the application.
     */
    public function register(): void
    {
        $this->reportable(function (Throwable $e) {
            //
        });
    }

    public function render($request, Throwable $exception)
    {
        // Let Laravel handle validation errors (422) and auth errors (401/403) natively
        if ($exception instanceof \Illuminate\Validation\ValidationException ||
            $exception instanceof \Illuminate\Auth\AuthenticationException ||
            $exception instanceof \Illuminate\Auth\Access\AuthorizationException) {
            return parent::render($request, $exception);
        }

        if ($exception instanceof BadRequestException) {
            return response()->json([
                'message' => $exception->getMessage(),
            ], 400);
        }

        // If Debug is ON, show the real error message
        if (config('app.debug')) {
            return response()->json([
                'error' => true,
                'message' => $exception->getMessage(),
                'exception' => get_class($exception),
                'line' => $exception->getLine(),
                'file' => $exception->getFile(),
            ], 500);
        }

        // Default response for production
        return response()->json([
            'error' => true,
            'message' => 'An unexpected error occurred',
        ], 500);
    }
}
