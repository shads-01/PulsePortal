<?php

namespace App\Http\Controllers;

use App\Models\Notification;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class NotificationController extends Controller
{
    /**
     * Return all notifications for the authenticated user, newest first.
     */
    public function index(Request $request): JsonResponse
    {
        $notifications = Notification::where('user_id', $request->user()->id)
            ->orderBy('created_at', 'desc')
            ->limit(30)
            ->get()
            ->map(fn($n) => [
                'id'             => $n->id,
                'type'           => $n->type,
                'title'          => $n->title,
                'message'        => $n->message,
                'appointment_id' => $n->appointment_id,
                'link'           => $n->link,
                'is_read'        => $n->is_read,
                'time'           => $n->created_at->diffForHumans(),
                'created_at'     => $n->created_at->toIso8601String(),
            ]);

        return response()->json($notifications);
    }

    /**
     * Mark all unread notifications as read for the authenticated user.
     */
    public function markAllRead(Request $request): JsonResponse
    {
        Notification::where('user_id', $request->user()->id)
            ->where('is_read', false)
            ->update(['is_read' => true]);

        return response()->json(['message' => 'Marked as read']);
    }

    /**
     * Delete a single notification (must belong to the authenticated user).
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $deleted = Notification::where('id', $id)
            ->where('user_id', $request->user()->id)
            ->delete();

        if (!$deleted) {
            return response()->json(['message' => 'Not found'], 404);
        }

        return response()->json(['message' => 'Deleted']);
    }
}
