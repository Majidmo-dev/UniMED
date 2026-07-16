from django.conf import settings
from django.contrib import admin
from django.urls import include, path, re_path
from django.views.static import serve

FRONTEND_DIR = settings.BASE_DIR.parent

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('api.urls')),
    re_path(r'^$', serve, {'path': 'index.html', 'document_root': FRONTEND_DIR}),
    re_path(
        r'^(?P<path>[^/]+\.(?:html|css|js|png|jpg|jpeg|gif|svg|ico|webp|woff2?))$',
        serve,
        {'document_root': FRONTEND_DIR},
    ),
]
