document.addEventListener('DOMContentLoaded', () => {
    let slideIndex = 0;
    showSlides();

    function showSlides() {
        let slides = document.querySelectorAll('.slide');
        slides.forEach((slide, index) => {
            slide.style.display = index === slideIndex ? 'block' : 'none';
        });
        slideIndex = (slideIndex + 1) % slides.length;
        setTimeout(showSlides, 5000);
    }

    const dealsContainer = document.querySelector('.deals-container');
    if(dealsContainer){
        fetch('deals.json')
        .then(response => response.json())
        .then(data => {
            data.deals.forEach(deal => {
                const dealCard = document.createElement('div');
                dealCard.className = 'deal-card';
                dealCard.innerHTML = `
                    <div class="price-overlay">Starting at $${deal.price}</div>
                    <img src="${deal.image}" alt="${deal.title}">
                    <h3>${deal.title}</h3>
                    <p>${deal.description}</p>
                `;
                dealsContainer.appendChild(dealCard);
            });
        });

    }

    const blogContainer = document.querySelector('.blog-container');
    if (blogContainer) {
        fetch('blog-posts.json')
            .then(response => response.json())
            .then(posts => {
                // Get the last 3 posts and reverse their order
                const lastThreePosts = posts.slice(-3).reverse();
    
                lastThreePosts.forEach(post => {
                    const postElement = document.createElement('div');
                    postElement.classList.add('blog-post');
    
                    postElement.innerHTML = `
                        <a href="blog.html?id=${post.id}">
                            <img src="${post.image}" alt="${post.title}">
                            <h3>${post.title}</h3>
                            <p>${post.excerpt}</p>
                        </a>
                    `;
    
                    blogContainer.appendChild(postElement);
                });
            })
            .catch(error => console.error('Error fetching blog posts:', error));
    }

    const contactForm = document.getElementById('contactForm');

    if (contactForm) {
        contactForm.addEventListener('submit', function (event) {
            event.preventDefault();
    
            const capthcaResp = grecaptcha.getResponse();
            
            if (capthcaResp.length == 0) {
                alert("Need ReCaptcha");
                return; // Stop the function if reCAPTCHA is not completed
            }
            
            const formData = new FormData(this);
            const formObject = {};
            formData.forEach((value, key) => {
                formObject[key] = value;
            });
            
            const modalText = document.getElementById('modal-text');
            const modal = document.getElementById('myModal'); // Make sure you have a reference to the modal element
    
            fetch('https://node.johnetravels.com/app1/send-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formObject)
            })
            .then(response => {
                if (response.ok) {
                    modalText.innerHTML = 'Email sent successfully!';
                    modal.style.display = "block";
                    contactForm.reset();
                } else {
                    return response.text().then(text => { throw new Error(text) });
                }
            })
            .catch(error => {
                console.error('Error sending email:', error);
                modalText.innerHTML = 'Error sending email: ' + error.message + '<br> Please email us at <a href="mailto:support@JohnETravels.com">support@JohnETravels.com</a>';
                modal.style.display = "block";
            });
        });
    }
    
    const hamMenu = document.querySelector('.ham-menu');
    const offScreenMenu = document.querySelector('.off-screen-menu');

    hamMenu.addEventListener('click', ()=>{
        hamMenu.classList.toggle('active');
        offScreenMenu.classList.toggle('active');
    })

    fetch('blog-posts.json')
    .then(response => response.json())
    .then(posts => {
        // Get the last post
        const lastPost = posts[posts.length - 1].id;

        const blogMenuButtons = document.getElementsByClassName('blog-menu-item');

        // Create the menu element
        const menuElement = document.createElement('a');
        menuElement.classList.add('button');
        menuElement.href = `blog.html?id=${lastPost}`;
        menuElement.textContent = 'Blog';

        // Convert HTMLCollection to an array and append the menu element to each
        Array.from(blogMenuButtons).forEach(blogMenuButton => {
            blogMenuButton.appendChild(menuElement.cloneNode(true));
        });
    });
// Get the modal
var modal = document.getElementById("myModal");

// Get the button that opens the modal
var btn = document.getElementById("openModalBtn");

// Get the <span> element that closes the modal
var span = document.getElementsByClassName("close")[0];

// When the user clicks on <span> (x), close the modal
span.onclick = function() {
    modal.style.display = "none";
}

// When the user clicks anywhere outside of the modal, close it
window.onclick = function(event) {
    if (event.target == modal) {
        modal.style.display = "none";
    }
}

});