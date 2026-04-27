document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const postId = urlParams.get('id');

    fetch('blog-posts.json')
        .then(response => response.json())
        .then(posts => {
            const postListContainer = document.getElementById('blog-post-list');
            postListContainer.innerHTML = `<h2>All Blog Posts</h2>`
            posts.forEach(post => {
                const postItem = document.createElement('div');
                postItem.classList.add('post-item');
                postItem.innerHTML = `
                    <h3><a href="?id=${post.id}">${post.title}</a></h3>
                    <p>${post.content.substring(0, 100)}...</p>
                `;
                postListContainer.appendChild(postItem);
            });

            if (postId) {
                const postIndex = posts.findIndex(p => p.id === postId);
                if (postIndex !== -1) {
                    const post = posts[postIndex];
                    const blogPostContainer = document.getElementById('blog-post');
                    blogPostContainer.innerHTML = `
                        <h2>${post.title}</h2>
                        <div id="blog-img-div">
                        <img src="${post.image}" alt="${post.title}">
                        </div>
                        <p>${post.content}</p>
                    `;

                    // Add navigation links for next and previous posts
                    const blogNavigation = document.createElement('div');
                    blogNavigation.classList.add('blog-navigation');

                    if (postIndex > 0) {
                        const prevPost = posts[postIndex - 1];
                        blogNavigation.innerHTML += `<a href="blog.html?id=${prevPost.id}">&laquo; Previous</a>`;
                    } else {
                        blogNavigation.innerHTML += `<a href="#" style="visibility:hidden">&laquo; Previous</a>`;
                    }

                    if (postIndex < posts.length - 1) {
                        const nextPost = posts[postIndex + 1];
                        blogNavigation.innerHTML += `<a href="blog.html?id=${nextPost.id}">Next &raquo;</a>`;
                    } else {
                        blogNavigation.innerHTML += `<a href="#" style="visibility:hidden">Next &raquo;</a>`;
                    }

                    blogPostContainer.appendChild(blogNavigation);
                } else {
                    document.getElementById('blog-post').innerHTML = '<p>Post not found.</p>';
                }
            } else {
                document.getElementById('blog-post').innerHTML = '<p>No post ID provided.</p>';
            }
        })
        .catch(error => console.error('Error fetching blog post:', error));
});
