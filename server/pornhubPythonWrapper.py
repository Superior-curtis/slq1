#!/usr/bin/env python3
"""
Pornhub API Python 包裝器
提供 Node.js 可調用的 API 端點
"""

import json
import sys
import random
from pornhub_api import PornhubApi

def get_categories():
    """獲取所有分類"""
    try:
        api = PornhubApi()
        categories = api.video.categories()
        result = []
        for cat in categories.categories[:100]:  # 限制前 100 個分類
            result.append({
                "id": cat.category,
                "name": cat.category,
                "url": f"https://www.pornhub.com/categories/{cat.category}",
                "thumbnail": "",
                "videoCount": 0
            })
        return {"success": True, "data": result}
    except Exception as e:
        print(f"Error in get_categories: {e}", file=sys.stderr)
        return {"success": False, "error": str(e)}

def search_videos(query="", category=None, ordering="mostviewed", count=10):
    """搜尋影片"""
    try:
        api = PornhubApi()
        search_params = {
            "ordering": ordering,
        }
        
        if query:
            search_params["search_query"] = query
        if category:
            search_params["category"] = category
            
        videos = api.search_videos.search_videos(**search_params)
        result = []
        for i, vid in enumerate(videos):
            if i >= count:
                break
            try:
                result.append({
                    "id": vid.video_id,
                    "title": vid.title,
                    "url": vid.url,
                    "thumbnail": vid.thumb if hasattr(vid, 'thumb') else "",
                    "duration": int(vid.duration) if hasattr(vid, 'duration') and vid.duration else 0,
                    "views": int(vid.views) if hasattr(vid, 'views') and vid.views else 0,
                    "rating": float(vid.rating) if hasattr(vid, 'rating') and vid.rating else 0,
                    "uploadDate": str(vid.upload_date) if hasattr(vid, 'upload_date') else "",
                    "actors": [],
                    "categories": [category] if category else []
                })
            except Exception as e:
                print(f"Error processing video {i}: {e}", file=sys.stderr)
                continue
                
        return {"success": True, "data": result}
    except Exception as e:
        print(f"Error in search_videos: {e}", file=sys.stderr)
        return {"success": False, "error": str(e)}

def get_video_by_id(video_id):
    """按 ID 獲取影片"""
    try:
        api = PornhubApi()
        video = api.video.get_by_id(video_id)
        return {
            "success": True,
            "data": {
                "id": video.video_id,
                "title": video.title,
                "url": video.url,
                "thumbnail": video.thumb if hasattr(video, 'thumb') else "",
                "duration": int(video.duration) if hasattr(video, 'duration') and video.duration else 0,
                "views": int(video.views) if hasattr(video, 'views') and video.views else 0,
                "rating": float(video.rating) if hasattr(video, 'rating') and video.rating else 0,
                "uploadDate": str(video.upload_date) if hasattr(video, 'upload_date') else "",
                "actors": [],
                "categories": []
            }
        }
    except Exception as e:
        print(f"Error in get_video_by_id: {e}", file=sys.stderr)
        return {"success": False, "error": str(e)}

def get_random_videos(category=None, count=5):
    """獲取隨機影片"""
    try:
        api = PornhubApi()
        search_params = {
            "ordering": "mostviewed",
        }
        
        if category:
            search_params["category"] = category
        
        videos = api.search_videos.search_videos(**search_params)
        
        # 隨機選擇
        video_list = []
        for i, vid in enumerate(videos):
            if i >= count * 3:  # 獲取更多以便隨機選擇
                break
            video_list.append(vid)
        
        random.shuffle(video_list)
        result = []
        
        for vid in video_list[:count]:
            try:
                result.append({
                    "id": vid.video_id,
                    "title": vid.title,
                    "url": vid.url,
                    "thumbnail": vid.thumb if hasattr(vid, 'thumb') else "",
                    "duration": int(vid.duration) if hasattr(vid, 'duration') and vid.duration else 0,
                    "views": int(vid.views) if hasattr(vid, 'views') and vid.views else 0,
                    "rating": float(vid.rating) if hasattr(vid, 'rating') and vid.rating else 0,
                    "uploadDate": str(vid.upload_date) if hasattr(vid, 'upload_date') else "",
                    "actors": [],
                    "categories": [category] if category else []
                })
            except Exception as e:
                print(f"Error processing random video: {e}", file=sys.stderr)
                continue
                
        return {"success": True, "data": result}
    except Exception as e:
        print(f"Error in get_random_videos: {e}", file=sys.stderr)
        return {"success": False, "error": str(e)}

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Missing command"}))
        sys.exit(1)
    
    command = sys.argv[1]
    
    try:
        if command == "categories":
            result = get_categories()
        elif command == "search":
            query = sys.argv[2] if len(sys.argv) > 2 else ""
            category = sys.argv[3] if len(sys.argv) > 3 else None
            count = int(sys.argv[4]) if len(sys.argv) > 4 else 10
            result = search_videos(query, category, count=count)
        elif command == "video":
            video_id = sys.argv[2] if len(sys.argv) > 2 else ""
            result = get_video_by_id(video_id)
        elif command == "random":
            category = sys.argv[2] if len(sys.argv) > 2 else None
            count = int(sys.argv[3]) if len(sys.argv) > 3 else 5
            result = get_random_videos(category, count)
        else:
            result = {"error": f"Unknown command: {command}"}
    except Exception as e:
        result = {"error": f"Unexpected error: {str(e)}"}
    
    print(json.dumps(result))
